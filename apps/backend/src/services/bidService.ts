import {
  BID_STATUS,
  type BidMetadata,
  type BidDetail,
  type BidOutcome,
  type BidRow as BidRowDto,
  type BidStatus,
  type BidSummary,
  type UpdateBidRows,
  type UploadBidRows,
} from 'shared-types'
import { Prisma } from '../../generated/prisma/client.js'
import { getBids as getBidsDb } from '../../generated/prisma/sql/getBids.js'
import {
  calculateBidRowPrice,
  isBidRowPriced,
  summariseBidRows,
  type BidRowPricingInput,
} from '../lib/bid-pricing.js'
import { toYmd, toYmdOrNull, todayYmd } from '../lib/date-only.js'
import { getNextSequence } from '../lib/db-utils.js'
import { decimalToNumber } from '../lib/decimal.js'
import { ConflictError, NotFoundError, ValidationError } from '../lib/errors.js'
import { pluralize } from '../lib/pluralize.js'
import { prisma } from '../prisma.js'

const BID_NUMBER_PREFIX = 'B-'
const BID_NUMBER_PAD = 7
const NOT_DRAFT_MESSAGE = 'Only draft bids can be changed'
const NOT_IN_REVIEW_MESSAGE = 'Only bids in review can be sent back or submitted'
const NOT_SUBMITTED_MESSAGE = 'Only submitted bids can be concluded'
const NO_ROWS_MESSAGE = 'Upload rows before review'
const ROW_NOT_ON_BID_MESSAGE = 'Row not on this bid'

type Tx = Prisma.TransactionClient

const BID_ROW_ORDER = { position: 'asc' } as const

async function getNewBidNumber(): Promise<string> {
  const sequence = await getNextSequence('bid')
  return `${BID_NUMBER_PREFIX}${String(sequence).padStart(BID_NUMBER_PAD, '0')}`
}

function notFound(bidNumber: string): NotFoundError {
  return new NotFoundError(`Bid ${bidNumber} not found`)
}

function toDecimalOrNull(value: number | null): Prisma.Decimal | null {
  return value === null ? null : new Prisma.Decimal(value)
}

async function transitionBidStatus(
  tx: Tx,
  bidNumber: string,
  from: BidStatus,
  data: Prisma.BidUpdateManyMutationInput,
  conflictMessage: string,
): Promise<number> {
  const { count } = await tx.bid.updateMany({
    where: { bid_number: bidNumber, status: from },
    data,
  })
  const bid = await tx.bid.findUnique({ where: { bid_number: bidNumber }, select: { id: true } })
  if (!bid) throw notFound(bidNumber)
  if (count === 0) throw new ConflictError(conflictMessage)
  return bid.id
}

function lockDraftBid(tx: Tx, bidNumber: string): Promise<number> {
  return transitionBidStatus(
    tx,
    bidNumber,
    BID_STATUS.DRAFT,
    { status: BID_STATUS.DRAFT },
    NOT_DRAFT_MESSAGE,
  )
}

const PRICING_INPUT_SELECT = {
  id: true,
  selling_price: true,
  transport_cost: true,
  margin_percent: true,
  zero_priced: true,
} as const

type BidDefaults = {
  margin_percent: Prisma.Decimal
  transport_cost: Prisma.Decimal
}

const BID_DEFAULTS_SELECT = { margin_percent: true, transport_cost: true } as const

function withBidDefaults<T extends BidRowPricingInput>(row: T, defaults: BidDefaults): T {
  return {
    ...row,
    margin_percent: row.margin_percent ?? defaults.margin_percent,
    transport_cost: row.transport_cost ?? defaults.transport_cost,
  }
}

function getBidDefaults(tx: Tx, bidId: number): Promise<BidDefaults> {
  return tx.bid.findUniqueOrThrow({ where: { id: bidId }, select: BID_DEFAULTS_SELECT })
}

type StoredBidRow = BidRowPricingInput & {
  id: number
  cells: string[]
  bid_price: Prisma.Decimal | null
  total_cost: Prisma.Decimal | null
}

function noBidAware(row: BidRowPricingInput, value: Prisma.Decimal | null): number | null {
  return row.zero_priced ? null : decimalToNumber(value)
}

function toBidRowDto(row: StoredBidRow, defaults: BidDefaults): BidRowDto {
  const resolved = withBidDefaults(row, defaults)
  return {
    id: row.id,
    cells: row.cells,
    selling_price: noBidAware(row, row.selling_price),
    transport_cost: noBidAware(row, row.transport_cost ?? defaults.transport_cost),
    transport_cost_overridden: row.transport_cost !== null,
    margin_percent: noBidAware(row, row.margin_percent ?? defaults.margin_percent),
    margin_overridden: row.margin_percent !== null,
    zero_priced: row.zero_priced,
    priced: isBidRowPriced(resolved),
    bid_price: noBidAware(row, row.bid_price),
    total_cost: noBidAware(row, row.total_cost),
  }
}

export async function getBidSummaries(
  fromDate: Date,
  toDate: Date,
  vendor: number,
): Promise<BidSummary[]> {
  const rows = await prisma.$queryRawTyped(getBidsDb(fromDate, toDate, vendor))
  return rows.map((row) => ({
    bid_number: row.bid_number,
    status: row.status,
    outcome: row.outcome,
    received_date: toYmd(row.received_date),
    due_date: toYmd(row.due_date),
    submitted_date: toYmdOrNull(row.submitted_date),
    vendor: {
      id: row.vendor_id,
      account_number: row.vendor_account_number,
      name: row.vendor_name,
    },
    notes: row.notes,
    total_cost: row.total_cost ?? 0,
  }))
}

export async function getBid(bidNumber: string): Promise<BidDetail> {
  const bid = await prisma.bid.findUnique({
    where: { bid_number: bidNumber },
    include: {
      vendor: { select: { id: true, account_number: true, name: true } },
      created_by: { select: { name: true } },
      rows: { orderBy: BID_ROW_ORDER },
    },
  })
  if (!bid) throw notFound(bidNumber)
  const totals = summariseBidRows(bid.rows.map((row) => withBidDefaults(row, bid)))
  return {
    bid_number: bid.bid_number,
    status: bid.status,
    outcome: bid.outcome,
    received_date: toYmd(bid.received_date),
    due_date: toYmd(bid.due_date),
    submitted_date: toYmdOrNull(bid.submitted_date),
    vendor: bid.vendor,
    notes: bid.notes,
    total_cost: totals.total_cost,
    created_at: bid.created_at,
    created_by: bid.created_by.name,
    margin_percent: bid.margin_percent.toNumber(),
    transport_cost: bid.transport_cost.toNumber(),
    headers: bid.headers,
    rows: bid.rows.map((row) => toBidRowDto(row, bid)),
    totals,
  }
}

export async function createBid(bid: BidMetadata, userId: number): Promise<string> {
  const bidNumber = await getNewBidNumber()
  await prisma.bid.create({
    data: {
      bid_number: bidNumber,
      status: BID_STATUS.DRAFT,
      vendor_id: bid.vendor.id,
      received_date: new Date(bid.received_date),
      due_date: new Date(bid.due_date),
      margin_percent: new Prisma.Decimal(bid.margin_percent),
      transport_cost: new Prisma.Decimal(bid.transport_cost),
      notes: bid.comment,
      created_by_id: userId,
      created_at: new Date(),
    },
  })
  return bidNumber
}

export async function updateBidMetadata(bidNumber: string, metadata: BidMetadata): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const bidId = await lockDraftBid(tx, bidNumber)
    const defaults: BidDefaults = {
      margin_percent: new Prisma.Decimal(metadata.margin_percent),
      transport_cost: new Prisma.Decimal(metadata.transport_cost),
    }
    await tx.bid.update({
      where: { id: bidId },
      data: {
        vendor_id: metadata.vendor.id,
        received_date: new Date(metadata.received_date),
        due_date: new Date(metadata.due_date),
        ...defaults,
        notes: metadata.comment,
      },
    })
    const rows = await tx.bidRow.findMany({
      where: { bid_id: bidId, OR: [{ margin_percent: null }, { transport_cost: null }] },
      select: PRICING_INPUT_SELECT,
    })
    await Promise.all(
      rows.map((row) =>
        tx.bidRow.update({
          where: { id: row.id },
          data: calculateBidRowPrice(withBidDefaults(row, defaults)),
        }),
      ),
    )
  })
}

export async function deleteBid(bidNumber: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const bidId = await lockDraftBid(tx, bidNumber)
    await tx.bidRow.deleteMany({ where: { bid_id: bidId } })
    await tx.bid.delete({ where: { id: bidId } })
  })
}

export async function uploadBidRows(bidNumber: string, upload: UploadBidRows): Promise<BidDetail> {
  await prisma.$transaction(async (tx) => {
    const bidId = await lockDraftBid(tx, bidNumber)
    await tx.bidRow.deleteMany({ where: { bid_id: bidId } })
    await tx.bid.update({ where: { id: bidId }, data: { headers: upload.headers } })
    await tx.bidRow.createMany({
      data: upload.rows.map((cells, position) => ({ bid_id: bidId, position, cells })),
    })
  })
  return getBid(bidNumber)
}

function mergePricingInput(row: BidRowPricingInput, update: UpdateBidRows): BidRowPricingInput {
  return {
    selling_price:
      update.selling_price === undefined
        ? row.selling_price
        : toDecimalOrNull(update.selling_price),
    transport_cost:
      update.transport_cost === undefined
        ? row.transport_cost
        : toDecimalOrNull(update.transport_cost),
    margin_percent:
      update.margin_percent === undefined
        ? row.margin_percent
        : toDecimalOrNull(update.margin_percent),
    zero_priced: update.zero_priced ?? row.zero_priced,
  }
}

export async function updateBidRows(bidNumber: string, update: UpdateBidRows): Promise<BidDetail> {
  await prisma.$transaction(async (tx) => {
    const bidId = await lockDraftBid(tx, bidNumber)
    const defaults = await getBidDefaults(tx, bidId)
    const rows = await tx.bidRow.findMany({
      where: { bid_id: bidId, id: { in: update.row_ids } },
      select: PRICING_INPUT_SELECT,
    })
    if (rows.length !== new Set(update.row_ids).size) {
      throw new ValidationError(ROW_NOT_ON_BID_MESSAGE)
    }
    await Promise.all(
      rows.map((row) => {
        const pricing = mergePricingInput(row, update)
        return tx.bidRow.update({
          where: { id: row.id },
          data: { ...pricing, ...calculateBidRowPrice(withBidDefaults(pricing, defaults)) },
        })
      }),
    )
  })
  return getBid(bidNumber)
}

export async function reviewBid(bidNumber: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const bidId = await transitionBidStatus(
      tx,
      bidNumber,
      BID_STATUS.DRAFT,
      { status: BID_STATUS.REVIEW },
      NOT_DRAFT_MESSAGE,
    )
    const defaults = await getBidDefaults(tx, bidId)
    const rows = await tx.bidRow.findMany({
      where: { bid_id: bidId },
      select: PRICING_INPUT_SELECT,
    })
    if (rows.length === 0) throw new ConflictError(NO_ROWS_MESSAGE)
    const unpricedCount = rows.filter(
      (row) => !isBidRowPriced(withBidDefaults(row, defaults)),
    ).length
    if (unpricedCount > 0) {
      throw new ConflictError(`Price every row first: ${pluralize(unpricedCount, 'row')} unpriced`)
    }
  })
}

export async function returnBidToDraft(bidNumber: string): Promise<void> {
  await prisma.$transaction((tx) =>
    transitionBidStatus(
      tx,
      bidNumber,
      BID_STATUS.REVIEW,
      { status: BID_STATUS.DRAFT },
      NOT_IN_REVIEW_MESSAGE,
    ),
  )
}

export async function submitBid(bidNumber: string): Promise<void> {
  await prisma.$transaction((tx) =>
    transitionBidStatus(
      tx,
      bidNumber,
      BID_STATUS.REVIEW,
      { status: BID_STATUS.SUBMITTED, submitted_date: new Date(todayYmd()) },
      NOT_IN_REVIEW_MESSAGE,
    ),
  )
}

export async function concludeBid(bidNumber: string, outcome: BidOutcome): Promise<void> {
  await prisma.$transaction((tx) =>
    transitionBidStatus(
      tx,
      bidNumber,
      BID_STATUS.SUBMITTED,
      { status: BID_STATUS.CONCLUDED, outcome },
      NOT_SUBMITTED_MESSAGE,
    ),
  )
}
