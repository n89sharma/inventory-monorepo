import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import {
  BID_COLUMN_ROLE,
  BID_OUTCOME,
  BID_STATUS,
  DEFAULT_BID_MARGIN_PERCENT,
  DEFAULT_BID_TRANSPORT_COST,
  type CreateBid,
} from 'shared-types'
import {
  ArrivalTestData,
  cleanupTransactionalData,
  seedArrivalTestData,
} from '../../test/factories.js'
import { todayYmd } from '../lib/date-only.js'
import { ConflictError, NotFoundError, ValidationError } from '../lib/errors.js'
import { prisma } from '../prisma.js'
import {
  concludeBid,
  createBid,
  deleteBid,
  getBid,
  getBidSummaries,
  removeBidRows,
  returnBidToDraft,
  reviewBid,
  submitBid,
  updateBidColumnMappings,
  updateBidMetadata,
  updateBidRows,
  uploadBidRows,
} from './bidService.js'

const RECEIVED_DATE = '2026-03-10'
const DUE_DATE = '2026-03-20'
const HEADERS: [string, ...string[]] = ['Serial', 'Model']
const THREE_ROWS: [string[], ...string[][]] = [
  ['S1', 'C3000'],
  ['S2', 'C3000'],
  ['S3', 'C4500'],
]

const VENDOR_HEADERS: [string, ...string[]] = ['Brand', 'Models', 'Serial', 'Mileage']
const VENDOR_ROWS: [string[], ...string[][]] = [['Canon', 'C3000', 'S1', '120000']]
const BRAND_COLUMN = 0
const MODELS_COLUMN = 1
const MILEAGE_COLUMN = 3

let seed: ArrivalTestData

function buildCreateBidInput(overrides: Partial<CreateBid> = {}): CreateBid {
  return {
    vendor: seed.vendor,
    received_date: RECEIVED_DATE,
    due_date: DUE_DATE,
    margin_percent: DEFAULT_BID_MARGIN_PERCENT,
    transport_cost: DEFAULT_BID_TRANSPORT_COST,
    comment: 'Lot of three',
    sheet: null,
    ...overrides,
  }
}

async function createBidWithRows(): Promise<{ bidNumber: string; rowIds: [number, ...number[]] }> {
  const bidNumber = await createBid(buildCreateBidInput(), seed.userId)
  const detail = await uploadBidRows(bidNumber, { headers: HEADERS, rows: THREE_ROWS })
  const [first, ...rest] = detail.rows.map((row) => row.id)
  if (first === undefined) throw new Error('Expected uploaded rows')
  return { bidNumber, rowIds: [first, ...rest] }
}

async function createVendorSheetBid(): Promise<string> {
  return createBid(
    buildCreateBidInput({ sheet: { headers: VENDOR_HEADERS, rows: VENDOR_ROWS } }),
    seed.userId,
  )
}

async function priceEveryRow(bidNumber: string, rowIds: [number, ...number[]]): Promise<void> {
  await updateBidRows(bidNumber, {
    row_ids: rowIds,
    selling_price: 1000,
    transport_cost: 100,
    margin_percent: 20,
  })
}

async function createSubmittedBid(): Promise<string> {
  const { bidNumber, rowIds } = await createBidWithRows()
  await priceEveryRow(bidNumber, rowIds)
  await reviewBid(bidNumber)
  await submitBid(bidNumber)
  return bidNumber
}

describe('bidService', () => {
  beforeAll(async () => {
    seed = await seedArrivalTestData()
  })

  afterEach(async () => {
    await cleanupTransactionalData()
  })

  afterAll(async () => {
    await cleanupTransactionalData()
  })

  it('creates a draft bid with a B- number padded to seven digits', async () => {
    const bidNumber = await createBid(buildCreateBidInput(), seed.userId)
    expect(bidNumber).toMatch(/^B-\d{7}$/)
    const bid = await getBid(bidNumber)
    expect(bid).toMatchObject({
      status: BID_STATUS.DRAFT,
      outcome: null,
      received_date: RECEIVED_DATE,
      due_date: DUE_DATE,
      submitted_date: null,
      vendor: { id: seed.vendor.id },
      notes: 'Lot of three',
      headers: [],
      rows: [],
    })
  })

  it('creates a bid with its pasted sheet in pasted order', async () => {
    const bidNumber = await createBid(
      buildCreateBidInput({ sheet: { headers: HEADERS, rows: THREE_ROWS } }),
      seed.userId,
    )
    const bid = await getBid(bidNumber)
    expect(bid.headers).toEqual(HEADERS)
    expect(bid.rows.map((row) => row.cells)).toEqual(THREE_ROWS)
  })

  it('lists bids received inside the range, filtered by vendor, with their summed total cost', async () => {
    const { bidNumber, rowIds } = await createBidWithRows()
    await priceEveryRow(bidNumber, rowIds)
    const emptyBidNumber = await createBid(buildCreateBidInput(), seed.userId)
    await createBid(buildCreateBidInput({ received_date: '2025-12-31' }), seed.userId)
    await createBid(buildCreateBidInput({ vendor: seed.transporter }), seed.userId)

    const summaries = await getBidSummaries(
      new Date('2026-01-01'),
      new Date('2026-12-31'),
      seed.vendor.id,
    )

    expect(summaries.map((bid) => bid.bid_number).sort()).toEqual(
      [bidNumber, emptyBidNumber].sort(),
    )
    expect(summaries.find((bid) => bid.bid_number === bidNumber)).toMatchObject({
      total_cost: 2400,
      row_count: 3,
    })
    expect(summaries.find((bid) => bid.bid_number === emptyBidNumber)).toMatchObject({
      total_cost: 0,
      row_count: 0,
    })
  })

  it('replaces earlier rows on upload and keeps the pasted order', async () => {
    const { bidNumber, rowIds } = await createBidWithRows()
    await priceEveryRow(bidNumber, rowIds)

    const detail = await uploadBidRows(bidNumber, {
      headers: ['Make', 'Model', 'Meter'],
      rows: [
        ['Ricoh', 'C6000', '120000'],
        ['Canon', 'C5550', '90000'],
      ],
    })

    expect(detail.headers).toEqual(['Make', 'Model', 'Meter'])
    expect(detail.rows.map((row) => row.cells)).toEqual([
      ['Ricoh', 'C6000', '120000'],
      ['Canon', 'C5550', '90000'],
    ])
    expect(detail.rows.every((row) => row.selling_price === null && !row.priced)).toBe(true)
  })

  it('recalculates bid price and total cost for every selected row', async () => {
    const { bidNumber, rowIds } = await createBidWithRows()
    await updateBidRows(bidNumber, { row_ids: rowIds, margin_percent: 20, transport_cost: 100 })
    const [firstRowId] = rowIds

    const detail = await updateBidRows(bidNumber, { row_ids: [firstRowId], selling_price: 1000 })

    const first = detail.rows.find((row) => row.id === firstRowId)
    expect(first).toMatchObject({ bid_price: 700, total_cost: 800, priced: true })
    expect(detail.totals).toEqual({
      total_cost: 800,
      expected_sale: 1000,
      expected_margin: 200,
      unpriced_count: 2,
    })
  })

  it('prices rows at the bid margin unless a row overrides it', async () => {
    const { bidNumber, rowIds } = await createBidWithRows()
    const [firstRowId, secondRowId] = rowIds
    if (secondRowId === undefined) throw new Error('Expected a second row')
    await updateBidRows(bidNumber, { row_ids: rowIds, selling_price: 1000, transport_cost: 100 })

    const detail = await updateBidRows(bidNumber, { row_ids: [secondRowId], margin_percent: 10 })

    expect(detail.margin_percent).toBe(25)
    expect(detail.rows.find((row) => row.id === firstRowId)).toMatchObject({
      margin_percent: 25,
      margin_overridden: false,
      bid_price: 650,
      margin_amount: 250,
      priced: true,
    })
    expect(detail.rows.find((row) => row.id === secondRowId)).toMatchObject({
      margin_percent: 10,
      margin_overridden: true,
      bid_price: 800,
    })
  })

  it('reprices rows on the bid margin when it changes, leaving overrides alone', async () => {
    const { bidNumber, rowIds } = await createBidWithRows()
    const [firstRowId, secondRowId] = rowIds
    if (secondRowId === undefined) throw new Error('Expected a second row')
    await updateBidRows(bidNumber, { row_ids: rowIds, selling_price: 1000, transport_cost: 100 })
    await updateBidRows(bidNumber, { row_ids: [secondRowId], margin_percent: 10 })

    await updateBidMetadata(bidNumber, buildCreateBidInput({ margin_percent: 30 }))

    const detail = await getBid(bidNumber)
    expect(detail.rows.find((row) => row.id === firstRowId)?.bid_price).toBe(600)
    expect(detail.rows.find((row) => row.id === secondRowId)?.bid_price).toBe(800)
  })

  it('prices rows at the bid freight until a row overrides it, and reprices when it changes', async () => {
    const { bidNumber, rowIds } = await createBidWithRows()
    const [firstRowId, secondRowId] = rowIds
    if (secondRowId === undefined) throw new Error('Expected a second row')
    await updateBidRows(bidNumber, { row_ids: rowIds, selling_price: 1000 })
    await updateBidRows(bidNumber, { row_ids: [secondRowId], transport_cost: 100 })

    const before = await getBid(bidNumber)
    expect(before.rows.find((row) => row.id === firstRowId)).toMatchObject({
      transport_cost: 30,
      transport_cost_overridden: false,
      bid_price: 720,
      total_cost: 750,
      priced: true,
    })

    await updateBidMetadata(bidNumber, buildCreateBidInput({ transport_cost: 50 }))

    const after = await getBid(bidNumber)
    expect(after.rows.find((row) => row.id === firstRowId)?.bid_price).toBe(700)
    expect(after.rows.find((row) => row.id === secondRowId)?.bid_price).toBe(650)
  })

  it('prices a zero-priced row at nothing', async () => {
    const { bidNumber, rowIds } = await createBidWithRows()
    const [firstRowId] = rowIds

    const detail = await updateBidRows(bidNumber, { row_ids: [firstRowId], zero_priced: true })

    expect(detail.rows.find((row) => row.id === firstRowId)).toMatchObject({
      zero_priced: true,
      priced: true,
      selling_price: null,
      transport_cost: null,
      margin_percent: null,
      bid_price: null,
      total_cost: null,
    })
  })

  it('rejects a row id from another bid', async () => {
    const { bidNumber } = await createBidWithRows()
    const other = await createBidWithRows()

    await expect(
      updateBidRows(bidNumber, { row_ids: other.rowIds, selling_price: 10 }),
    ).rejects.toThrow(ValidationError)
  })

  it('removes the selected rows and keeps the rest in order', async () => {
    const { bidNumber, rowIds } = await createBidWithRows()
    const [, secondRowId] = rowIds
    if (secondRowId === undefined) throw new Error('Expected a second row')

    await removeBidRows(bidNumber, { row_ids: [secondRowId] })

    const detail = await getBid(bidNumber)
    expect(detail.rows.map((row) => row.cells)).toEqual([
      ['S1', 'C3000'],
      ['S3', 'C4500'],
    ])
    expect(detail.totals.unpriced_count).toBe(2)
  })

  it('removes nothing when a row id belongs to another bid', async () => {
    const { bidNumber, rowIds } = await createBidWithRows()
    const other = await createBidWithRows()
    const [firstRowId] = rowIds

    await expect(
      removeBidRows(bidNumber, { row_ids: [firstRowId, ...other.rowIds] }),
    ).rejects.toThrow(ValidationError)

    expect((await getBid(bidNumber)).rows).toHaveLength(3)
    expect((await getBid(other.bidNumber)).rows).toHaveLength(3)
  })

  it('saves manual column mappings and returns them on the bid', async () => {
    const bidNumber = await createVendorSheetBid()

    const detail = await updateBidColumnMappings(bidNumber, {
      mappings: [
        { column_index: BRAND_COLUMN, role: BID_COLUMN_ROLE.BRAND },
        { column_index: MILEAGE_COLUMN, role: BID_COLUMN_ROLE.TOTAL_METER },
      ],
    })

    expect(detail.column_mappings).toEqual([
      { column_index: BRAND_COLUMN, role: BID_COLUMN_ROLE.BRAND },
      { column_index: MILEAGE_COLUMN, role: BID_COLUMN_ROLE.TOTAL_METER },
    ])
  })

  it('replaces the earlier column mappings on a second save', async () => {
    const bidNumber = await createVendorSheetBid()
    await updateBidColumnMappings(bidNumber, {
      mappings: [{ column_index: BRAND_COLUMN, role: BID_COLUMN_ROLE.BRAND }],
    })

    const detail = await updateBidColumnMappings(bidNumber, {
      mappings: [{ column_index: MILEAGE_COLUMN, role: BID_COLUMN_ROLE.TOTAL_METER }],
    })

    expect(detail.column_mappings).toEqual([
      { column_index: MILEAGE_COLUMN, role: BID_COLUMN_ROLE.TOTAL_METER },
    ])
  })

  it('rejects a mapping to a column the bid does not have', async () => {
    const bidNumber = await createVendorSheetBid()
    await expect(
      updateBidColumnMappings(bidNumber, {
        mappings: [{ column_index: VENDOR_HEADERS.length, role: BID_COLUMN_ROLE.BRAND }],
      }),
    ).rejects.toThrow(ValidationError)
  })

  it('rejects a mapping to an automatically recognised column', async () => {
    const bidNumber = await createVendorSheetBid()
    await expect(
      updateBidColumnMappings(bidNumber, {
        mappings: [{ column_index: MODELS_COLUMN, role: BID_COLUMN_ROLE.NOTES }],
      }),
    ).rejects.toThrow(ValidationError)
  })

  it('rejects a mapping of an automatically recognised type', async () => {
    const bidNumber = await createVendorSheetBid()
    await expect(
      updateBidColumnMappings(bidNumber, {
        mappings: [{ column_index: MILEAGE_COLUMN, role: BID_COLUMN_ROLE.MODEL }],
      }),
    ).rejects.toThrow(ValidationError)
    expect((await getBid(bidNumber)).column_mappings).toEqual([])
  })

  it('accepts re-saving a stored mapping that an automatic match would now clash with', async () => {
    const bidNumber = await createVendorSheetBid()
    const { id } = await prisma.bid.findUniqueOrThrow({ where: { bid_number: bidNumber } })
    await prisma.bidColumnMapping.create({
      data: { bid_id: id, column_index: MILEAGE_COLUMN, role: BID_COLUMN_ROLE.MODEL },
    })

    const detail = await updateBidColumnMappings(bidNumber, {
      mappings: [{ column_index: MILEAGE_COLUMN, role: BID_COLUMN_ROLE.MODEL }],
    })

    expect(detail.column_mappings).toEqual([
      { column_index: MILEAGE_COLUMN, role: BID_COLUMN_ROLE.MODEL },
    ])
  })

  it('clears manual column mappings on re-upload', async () => {
    const bidNumber = await createVendorSheetBid()
    await updateBidColumnMappings(bidNumber, {
      mappings: [{ column_index: BRAND_COLUMN, role: BID_COLUMN_ROLE.BRAND }],
    })

    const detail = await uploadBidRows(bidNumber, { headers: VENDOR_HEADERS, rows: VENDOR_ROWS })

    expect(detail.column_mappings).toEqual([])
  })

  it('deletes a draft that has column mappings', async () => {
    const bidNumber = await createVendorSheetBid()
    await updateBidColumnMappings(bidNumber, {
      mappings: [{ column_index: BRAND_COLUMN, role: BID_COLUMN_ROLE.BRAND }],
    })

    await deleteBid(bidNumber)

    await expect(getBid(bidNumber)).rejects.toThrow(NotFoundError)
  })

  it('rejects review with no rows', async () => {
    const bidNumber = await createBid(buildCreateBidInput(), seed.userId)
    await expect(reviewBid(bidNumber)).rejects.toThrow(ConflictError)
    expect((await getBid(bidNumber)).status).toBe(BID_STATUS.DRAFT)
  })

  it('rejects review while a row is unpriced', async () => {
    const { bidNumber, rowIds } = await createBidWithRows()
    const [firstRowId, ...otherRowIds] = rowIds
    await updateBidRows(bidNumber, {
      row_ids: [firstRowId],
      selling_price: 1000,
      transport_cost: 100,
      margin_percent: 20,
    })
    expect(otherRowIds.length).toBeGreaterThan(0)

    await expect(reviewBid(bidNumber)).rejects.toThrow('2 rows unpriced')
    expect((await getBid(bidNumber)).status).toBe(BID_STATUS.DRAFT)
  })

  it('moves to review once every row is priced or zero-priced', async () => {
    const { bidNumber, rowIds } = await createBidWithRows()
    const [firstRowId, ...otherRowIds] = rowIds
    await updateBidRows(bidNumber, { row_ids: [firstRowId], zero_priced: true })
    const [secondRowId, ...remainingRowIds] = otherRowIds
    if (secondRowId === undefined) throw new Error('Expected a second row')
    await priceEveryRow(bidNumber, [secondRowId, ...remainingRowIds])

    await reviewBid(bidNumber)

    expect((await getBid(bidNumber)).status).toBe(BID_STATUS.REVIEW)
  })

  it('returns a bid in review to draft, and only from review', async () => {
    const { bidNumber, rowIds } = await createBidWithRows()
    await expect(returnBidToDraft(bidNumber)).rejects.toThrow(ConflictError)
    await priceEveryRow(bidNumber, rowIds)
    await reviewBid(bidNumber)

    await returnBidToDraft(bidNumber)

    expect((await getBid(bidNumber)).status).toBe(BID_STATUS.DRAFT)
  })

  it('submits only from review and records the submitted date', async () => {
    const { bidNumber, rowIds } = await createBidWithRows()
    await expect(submitBid(bidNumber)).rejects.toThrow(ConflictError)
    await priceEveryRow(bidNumber, rowIds)
    await reviewBid(bidNumber)

    await submitBid(bidNumber)

    expect(await getBid(bidNumber)).toMatchObject({
      status: BID_STATUS.SUBMITTED,
      submitted_date: todayYmd(),
    })
  })

  it('concludes only a submitted bid and records the outcome', async () => {
    const { bidNumber } = await createBidWithRows()
    await expect(concludeBid(bidNumber, BID_OUTCOME.WON)).rejects.toThrow(ConflictError)
    const submittedBidNumber = await createSubmittedBid()

    await concludeBid(submittedBidNumber, BID_OUTCOME.LOST)

    expect(await getBid(submittedBidNumber)).toMatchObject({
      status: BID_STATUS.CONCLUDED,
      outcome: BID_OUTCOME.LOST,
    })
  })

  it('rejects a second conclusion of the same bid', async () => {
    const bidNumber = await createSubmittedBid()
    await concludeBid(bidNumber, BID_OUTCOME.WON)
    await expect(concludeBid(bidNumber, BID_OUTCOME.LOST)).rejects.toThrow(ConflictError)
    expect((await getBid(bidNumber)).outcome).toBe(BID_OUTCOME.WON)
  })

  it('rejects upload, row pricing, row removal, column mapping, header edits and delete outside draft', async () => {
    const bidNumber = await createSubmittedBid()
    const { rows } = await getBid(bidNumber)
    const rowIds = rows.map((row) => row.id)
    const [firstRowId] = rowIds
    if (firstRowId === undefined) throw new Error('Expected rows')

    await expect(uploadBidRows(bidNumber, { headers: HEADERS, rows: THREE_ROWS })).rejects.toThrow(
      ConflictError,
    )
    await expect(
      updateBidRows(bidNumber, { row_ids: [firstRowId], selling_price: 1 }),
    ).rejects.toThrow(ConflictError)
    await expect(removeBidRows(bidNumber, { row_ids: [firstRowId] })).rejects.toThrow(ConflictError)
    await expect(updateBidColumnMappings(bidNumber, { mappings: [] })).rejects.toThrow(
      ConflictError,
    )
    await expect(updateBidMetadata(bidNumber, buildCreateBidInput())).rejects.toThrow(ConflictError)
    await expect(deleteBid(bidNumber)).rejects.toThrow(ConflictError)
  })

  it('edits the header of a draft', async () => {
    const bidNumber = await createBid(buildCreateBidInput(), seed.userId)

    await updateBidMetadata(
      bidNumber,
      buildCreateBidInput({ vendor: seed.transporter, due_date: '2026-04-01', comment: null }),
    )

    expect(await getBid(bidNumber)).toMatchObject({
      vendor: { id: seed.transporter.id },
      due_date: '2026-04-01',
      notes: null,
    })
  })

  it('deletes a draft and its rows', async () => {
    const { bidNumber } = await createBidWithRows()
    await deleteBid(bidNumber)
    await expect(getBid(bidNumber)).rejects.toThrow(NotFoundError)
  })

  it('reports a missing bid as not found', async () => {
    await expect(submitBid('B-9999999')).rejects.toThrow(NotFoundError)
  })
})
