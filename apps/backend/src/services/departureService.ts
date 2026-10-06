import {
  Permission,
  ASSET_STATUS,
  AssetDelta,
  CreateDeparture,
  DEFAULT_OUTGOING_STATUS,
  DEPARTURE_STATUS,
  DepartureDetail,
  DepartureSummary,
  OutgoingStatus,
  OutgoingStatusSchema,
  ScheduleDeparture,
  UpdateDepartureDate,
  UpdateDepartureMetadata,
} from 'shared-types'
import type { Prisma } from '../../generated/prisma/client.js'
import {
  getAssetsForDepartures,
  getDepartures as getDeparturesDb,
  getInvoicesForDeparture,
} from '../../generated/prisma/sql.js'
import { mapAssetSearchRow } from '../lib/asset-mappers.js'
import { redactSearchRowCost } from '../lib/cost-redaction.js'
import {
  addRemoveCollectionFromAssets,
  assertAssetsNotMissing,
  assertAssetsNotOnDeparture,
  assertAssetsNotOnOpenTransfer,
  assertAssetsOnHand,
  recordCollectionAssetDelta,
} from '../lib/collection-assets.js'
import { getNextSequence } from '../lib/db-utils.js'
import { toYmdOrNull, todayYmd } from '../lib/date-only.js'
import { decimalToNumber } from '../lib/decimal.js'
import { ConflictError, NotFoundError } from '../lib/errors.js'
import { logger } from '../lib/logger.js'
import { pluralize } from '../lib/pluralize.js'
import { prisma } from '../prisma.js'
import { mapUser } from '../lib/user-mappers.js'
import {
  recordAssetStatusChange,
  recordAssetUpdate,
  recordDepartureCreate,
  recordDepartureUpdate,
} from './historyService.js'
import { archiveHoldsEmptiedByReleasedAssets, recordHoldRelease } from './holdService.js'

const NOT_ON_HAND_MESSAGE = 'Not in stock or held, cannot be loaded on a departure:'
const NOT_LOADED_MESSAGE = 'Only loaded assets can be returned to stock:'
const CANNOT_EDIT_MESSAGE = 'cannot be edited after scheduling'
const REVERTIBLE_STATUSES: readonly string[] = [
  DEPARTURE_STATUS.LOADING_IN_PROGRESS,
  DEPARTURE_STATUS.LOADED,
]

export async function getDepartureSummaries(
  fromDate: Date,
  toDate: Date,
  warehouse: number,
  customer: number,
): Promise<DepartureSummary[]> {
  const rows = await prisma.$queryRawTyped(getDeparturesDb(fromDate, toDate, warehouse, customer))
  return rows.map((row) => ({ ...row, departure_date: toYmdOrNull(row.departure_date) }))
}

export async function getDeparture(
  departureNumber: string,
  permissions: ReadonlySet<Permission>,
): Promise<DepartureDetail> {
  const [departure, assets, invoices] = await Promise.all([
    prisma.departure.findUnique({
      where: { departure_number: departureNumber },
      include: {
        origin: true,
        destination: true,
        transporter: true,
        created_by: true,
        sales_representative: true,
      },
    }),
    prisma.$queryRawTyped(getAssetsForDepartures(departureNumber)),
    prisma.$queryRawTyped(getInvoicesForDeparture(departureNumber)),
  ])
  if (!departure) throw new NotFoundError(`Departure ${departureNumber} not found`)
  return {
    departure_number: departure.departure_number,
    status: departure.status,
    origin: departure.origin,
    customer: departure.destination,
    transporter: departure.transporter,
    notes: departure.notes,
    created_at: departure.created_at,
    created_by: departure.created_by?.name,
    departure_date: toYmdOrNull(departure.departure_date),
    salesperson: departure.sales_representative && mapUser(departure.sales_representative),
    assets: assets.map((r) => ({
      ...redactSearchRowCost(mapAssetSearchRow(r), permissions),
      scan: { loaded: r.loaded ?? false },
      outgoing_status: OutgoingStatusSchema.parse(r.outgoing_status),
    })),
    invoices,
  }
}

async function getOutgoingStatusIds(): Promise<Map<string, number>> {
  const rows = await prisma.status.findMany({
    where: { status: { in: [...OutgoingStatusSchema.options] } },
  })
  return new Map(rows.map((s) => [s.status, s.id]))
}

function requireOutgoingStatusId(
  statusIdByName: Map<string, number>,
  outgoingStatus: OutgoingStatus,
): number {
  const statusId = statusIdByName.get(outgoingStatus)
  if (statusId === undefined) {
    throw new Error(`Outgoing statuses not seeded in DB: ${outgoingStatus}`)
  }
  return statusId
}

export async function createDeparture(departure: CreateDeparture, userId: number): Promise<string> {
  const originCode = departure.origin.city_code
  const currentDateTime = new Date()
  const departureNumber = await getNewDepartureNumber(originCode)
  const assetIds = departure.assets.map((a) => a.id)
  const statusIdByName = await getOutgoingStatusIds()
  const assetDepartureRows = departure.assets.map((asset) => ({
    asset_id: asset.id,
    outgoing_status_id: requireOutgoingStatusId(statusIdByName, asset.outgoing_status),
  }))

  const newDeparture = await prisma.$transaction(async (tx) => {
    await assertAssetsNotOnDeparture(tx, assetIds)
    await assertAssetsNotMissing(tx, assetIds)
    await assertAssetsNotOnOpenTransfer(tx, assetIds)

    const created = await tx.departure.create({
      data: {
        departure_number: departureNumber,
        origin: { connect: { id: departure.origin.id } },
        destination: { connect: { id: departure.customer.id } },
        transporter: { connect: { id: departure.transporter.id } },
        created_by: { connect: { id: userId } },
        sales_representative: { connect: { id: departure.salesperson_id } },
        notes: departure.comment,
        created_at: currentDateTime,
      },
    })
    await tx.asset.updateMany({
      where: { id: { in: assetIds } },
      data: { departure_id: created.id },
    })
    await tx.assetDeparture.createMany({
      data: assetDepartureRows.map((row) => ({ ...row, departure_id: created.id })),
    })
    return created
  })

  await recordDepartureCreate(
    newDeparture.id,
    {
      departure_number: departureNumber,
      origin_id: departure.origin.id,
      destination_id: departure.customer.id,
      sales_representative_id: departure.salesperson_id,
      created_at: currentDateTime,
    },
    userId,
  )

  await recordCollectionAssetDelta(
    'Departure',
    'departure_id',
    newDeparture.id,
    assetIds,
    [],
    userId,
  )

  return departureNumber
}

export async function patchDepartureMetadata(
  departureNumber: string,
  metadata: UpdateDepartureMetadata,
  userId: number,
): Promise<void> {
  const current = await prisma.$transaction(async (tx) => {
    const departure = await tx.departure.findUnique({
      where: { departure_number: departureNumber },
      select: {
        id: true,
        status: true,
        origin_id: true,
        destination_id: true,
        transporter_id: true,
        sales_representative_id: true,
        notes: true,
      },
    })
    if (!departure) throw new NotFoundError(`Departure ${departureNumber} not found`)
    if (departure.status !== DEPARTURE_STATUS.DRAFT) {
      throw new ConflictError(`Departure ${departureNumber} ${CANNOT_EDIT_MESSAGE}`)
    }
    await tx.departure.update({
      where: { id: departure.id },
      data: {
        origin_id: metadata.origin.id,
        destination_id: metadata.customer.id,
        transporter_id: metadata.transporter.id,
        sales_representative_id: metadata.salesperson.id,
        notes: metadata.comment,
      },
    })
    return departure
  })

  await recordDepartureUpdate(
    current.id,
    {
      origin_id: current.origin_id,
      destination_id: current.destination_id,
      transporter_id: current.transporter_id,
      sales_representative_id: current.sales_representative_id,
    },
    {
      origin_id: metadata.origin.id,
      destination_id: metadata.customer.id,
      transporter_id: metadata.transporter.id,
      sales_representative_id: metadata.salesperson.id,
    },
    userId,
  )
}

export async function patchDepartureNotes(departureNumber: string, comment: string): Promise<void> {
  const departure = await prisma.departure.findUnique({
    where: { departure_number: departureNumber },
    select: { id: true },
  })
  if (!departure) throw new NotFoundError(`Departure ${departureNumber} not found`)
  await prisma.departure.update({ where: { id: departure.id }, data: { notes: comment } })
}

export async function scheduleDeparture(
  departureNumber: string,
  schedule: ScheduleDeparture,
  userId: number,
): Promise<void> {
  const departureId = await prisma.$transaction(async (tx) => {
    const departure = await tx.departure.findUnique({
      where: { departure_number: departureNumber },
      select: { id: true, status: true, _count: { select: { asset_departures: true } } },
    })
    if (!departure) throw new NotFoundError(`Departure ${departureNumber} not found`)
    if (departure.status !== DEPARTURE_STATUS.DRAFT) {
      throw new ConflictError(`Departure ${departureNumber} has already been scheduled`)
    }
    if (departure._count.asset_departures === 0) {
      throw new ConflictError(`Departure ${departureNumber} has no assets to schedule`)
    }
    await tx.departure.update({
      where: { id: departure.id },
      data: {
        status: DEPARTURE_STATUS.SCHEDULED,
        departure_date: new Date(schedule.departure_date),
      },
    })
    return departure.id
  })

  await recordDepartureUpdate(
    departureId,
    { status: DEPARTURE_STATUS.DRAFT, departure_date: null },
    { status: DEPARTURE_STATUS.SCHEDULED, departure_date: schedule.departure_date },
    userId,
  )
}

export async function patchDepartureDate(
  departureNumber: string,
  update: UpdateDepartureDate,
  userId: number,
): Promise<void> {
  const { departureId, previousDate } = await prisma.$transaction(async (tx) => {
    const departure = await tx.departure.findUnique({
      where: { departure_number: departureNumber },
      select: { id: true, status: true, departure_date: true },
    })
    if (!departure) throw new NotFoundError(`Departure ${departureNumber} not found`)
    if (departure.status !== DEPARTURE_STATUS.SCHEDULED) {
      throw new ConflictError(
        `Departure ${departureNumber} date can only be edited while scheduled`,
      )
    }
    await tx.departure.update({
      where: { id: departure.id },
      data: { departure_date: new Date(update.departure_date) },
    })
    return { departureId: departure.id, previousDate: toYmdOrNull(departure.departure_date) }
  })

  await recordDepartureUpdate(
    departureId,
    { departure_date: previousDate },
    { departure_date: update.departure_date },
    userId,
  )
}

export async function startLoadingDeparture(
  departureNumber: string,
  userId: number,
): Promise<void> {
  const { departureId, previousDate, newDate } = await prisma.$transaction(async (tx) => {
    const departure = await tx.departure.findUnique({
      where: { departure_number: departureNumber },
      select: {
        id: true,
        status: true,
        departure_date: true,
        asset_departures: { select: { asset_id: true } },
      },
    })
    if (!departure) throw new NotFoundError(`Departure ${departureNumber} not found`)
    if (departure.status !== DEPARTURE_STATUS.SCHEDULED) {
      throw new ConflictError(`Departure ${departureNumber} is not scheduled`)
    }
    // Re-check on hand: an asset's status can change after scheduling, and loading must halt
    // rather than sell a no-longer-available asset.
    const assetIds = departure.asset_departures.map((row) => row.asset_id)
    await assertAssetsOnHand(
      tx,
      assetIds,
      (detail) => new ConflictError(`${NOT_ON_HAND_MESSAGE} ${detail}`),
    )
    await assertAssetsNotOnOpenTransfer(tx, assetIds)

    const today = todayYmd()
    await tx.departure.update({
      where: { id: departure.id },
      data: { status: DEPARTURE_STATUS.LOADING_IN_PROGRESS, departure_date: new Date(today) },
    })
    return {
      departureId: departure.id,
      previousDate: toYmdOrNull(departure.departure_date),
      newDate: today,
    }
  })

  await recordDepartureUpdate(
    departureId,
    { status: DEPARTURE_STATUS.SCHEDULED, departure_date: previousDate },
    { status: DEPARTURE_STATUS.LOADING_IN_PROGRESS, departure_date: newDate },
    userId,
  )
}

export async function addAssetsToDepartureAndRecord(
  departureNumber: string,
  delta: AssetDelta,
  userId: number,
): Promise<void> {
  const statusIdByName = await getOutgoingStatusIds()
  const defaultStatusId = requireOutgoingStatusId(statusIdByName, DEFAULT_OUTGOING_STATUS)

  const departureId = await prisma.$transaction(async (tx) => {
    const departure = await tx.departure.findUnique({
      where: { departure_number: departureNumber },
      select: { id: true, status: true },
    })
    if (!departure) throw new NotFoundError(`Departure ${departureNumber} not found`)
    if (departure.status !== DEPARTURE_STATUS.DRAFT) {
      throw new ConflictError(`Departure ${departureNumber} ${CANNOT_EDIT_MESSAGE}`)
    }

    const removable = await tx.assetDeparture.count({
      where: { departure_id: departure.id, asset_id: { in: delta.assetIdsToRemove } },
    })
    if (removable !== delta.assetIdsToRemove.length) {
      throw new ConflictError('Some assets do not belong to this departure')
    }

    await assertAssetsNotMissing(tx, delta.assetIdsToAdd)
    await assertAssetsNotOnOpenTransfer(tx, delta.assetIdsToAdd)
    await addRemoveCollectionFromAssets(tx, {
      assetsToAdd: delta.assetIdsToAdd,
      assetsToRemove: delta.assetIdsToRemove,
      assetInCollectionWhere: { departure_id: { not: null } },
      assetInCollectionError: (barcodes) =>
        new ConflictError(`Assets already assigned to a departure: ${barcodes.join(', ')}`),
      add: { departure_id: departure.id },
      remove: { departure_id: null },
    })
    await tx.assetDeparture.deleteMany({
      where: { departure_id: departure.id, asset_id: { in: delta.assetIdsToRemove } },
    })
    await tx.assetDeparture.createMany({
      data: delta.assetIdsToAdd.map((assetId) => ({
        asset_id: assetId,
        departure_id: departure.id,
        outgoing_status_id: defaultStatusId,
      })),
    })
    return departure.id
  })

  await recordCollectionAssetDelta(
    'Departure',
    'departure_id',
    departureId,
    delta.assetIdsToAdd,
    delta.assetIdsToRemove,
    userId,
  )
}

export async function setDepartureOutgoingStatus(
  departureNumber: string,
  assetIds: number[],
  outgoingStatus: OutgoingStatus,
): Promise<void> {
  const statusIdByName = await getOutgoingStatusIds()
  const outgoingStatusId = requireOutgoingStatusId(statusIdByName, outgoingStatus)

  await prisma.$transaction(async (tx) => {
    const departure = await tx.departure.findUnique({
      where: { departure_number: departureNumber },
      select: { id: true, status: true },
    })
    if (!departure) throw new NotFoundError(`Departure ${departureNumber} not found`)
    if (departure.status !== DEPARTURE_STATUS.DRAFT) {
      throw new ConflictError(`Departure ${departureNumber} ${CANNOT_EDIT_MESSAGE}`)
    }
    const updated = await tx.assetDeparture.updateMany({
      where: { asset_id: { in: assetIds }, departure_id: departure.id },
      data: { outgoing_status_id: outgoingStatusId },
    })
    if (updated.count !== assetIds.length) {
      throw new ConflictError('Some assets do not belong to this departure')
    }
  })
}

async function loadDepartureAssetRow(
  tx: Prisma.TransactionClient,
  departureNumber: string,
  assetId: number,
) {
  const departure = await tx.departure.findUnique({
    where: { departure_number: departureNumber },
    select: { id: true, status: true },
  })
  if (!departure) throw new NotFoundError(`Departure ${departureNumber} not found`)
  if (departure.status !== DEPARTURE_STATUS.LOADING_IN_PROGRESS) {
    throw new ConflictError(`Departure ${departureNumber} is not loading`)
  }
  const row = await tx.assetDeparture.findUnique({
    where: { asset_id: assetId },
    select: {
      departure_id: true,
      outgoing_status_id: true,
      loaded: true,
      asset: {
        select: {
          id: true,
          barcode: true,
          status_id: true,
          hold_id: true,
          status: { select: { status: true } },
        },
      },
    },
  })
  if (!row || row.departure_id !== departure.id) {
    throw new NotFoundError(`Asset ${assetId} not found on departure ${departureNumber}`)
  }
  return { row, asset: row.asset }
}

export async function scanAssetLoaded(
  departureNumber: string,
  assetId: number,
  userId: number,
): Promise<void> {
  const currentDateTime = new Date()
  const { prior, outgoingStatusId, holdRelease } = await prisma.$transaction(async (tx) => {
    const { row, asset } = await loadDepartureAssetRow(tx, departureNumber, assetId)
    if (row.loaded) throw new ConflictError(`Asset ${asset.barcode} is already loaded`)
    if (asset.status.status === ASSET_STATUS.MISSING) {
      throw new ConflictError(`Asset ${asset.barcode} is marked missing`)
    }
    await tx.asset.update({
      where: { id: assetId },
      data: { status_id: row.outgoing_status_id, hold_id: null },
    })
    await tx.assetDeparture.update({ where: { asset_id: assetId }, data: { loaded: true } })
    return {
      prior: { id: asset.id, status_id: asset.status_id },
      outgoingStatusId: row.outgoing_status_id,
      holdRelease: await archiveHoldsEmptiedByReleasedAssets(
        tx,
        [{ id: asset.id, hold_id: asset.hold_id }],
        currentDateTime,
      ),
    }
  })

  await recordHoldRelease(holdRelease, currentDateTime, userId)
  await recordAssetStatusChange([prior], outgoingStatusId, userId)
}

export async function markAssetMissingAtLoad(
  departureNumber: string,
  assetId: number,
  userId: number,
): Promise<void> {
  const { prior, missingStatusId } = await prisma.$transaction(async (tx) => {
    const { row, asset } = await loadDepartureAssetRow(tx, departureNumber, assetId)
    if (row.loaded) throw new ConflictError(`Asset ${asset.barcode} is already loaded`)
    const missingStatus = await tx.status.findUniqueOrThrow({
      where: { status: ASSET_STATUS.MISSING },
      select: { id: true },
    })
    await tx.asset.update({ where: { id: assetId }, data: { status_id: missingStatus.id } })
    return {
      prior: { id: asset.id, status_id: asset.status_id },
      missingStatusId: missingStatus.id,
    }
  })

  await recordAssetStatusChange([prior], missingStatusId, userId)
}

export async function undoAssetLoad(
  departureNumber: string,
  assetId: number,
  userId: number,
): Promise<void> {
  const inStockStatus = await prisma.status.findUniqueOrThrow({
    where: { status: ASSET_STATUS.IN_STOCK },
    select: { id: true },
  })

  const prior = await prisma.$transaction(async (tx) => {
    const { row, asset } = await loadDepartureAssetRow(tx, departureNumber, assetId)
    if (!row.loaded) throw new ConflictError(`Asset ${asset.barcode} is not loaded`)
    await tx.asset.update({ where: { id: assetId }, data: { status_id: inStockStatus.id } })
    await tx.assetDeparture.update({ where: { asset_id: assetId }, data: { loaded: false } })
    return { id: asset.id, status_id: asset.status_id }
  })

  await recordAssetStatusChange([prior], inStockStatus.id, userId)
}

export async function finishLoadingDeparture(
  departureNumber: string,
  userId: number,
): Promise<void> {
  const departureId = await prisma.$transaction(async (tx) => {
    const departure = await tx.departure.findUnique({
      where: { departure_number: departureNumber },
      select: {
        id: true,
        status: true,
        asset_departures: {
          select: { loaded: true, asset: { select: { status: { select: { status: true } } } } },
        },
      },
    })
    if (!departure) throw new NotFoundError(`Departure ${departureNumber} not found`)
    if (departure.status !== DEPARTURE_STATUS.LOADING_IN_PROGRESS) {
      throw new ConflictError(`Departure ${departureNumber} is not loading`)
    }
    const unresolved = departure.asset_departures.filter(
      (row) => !row.loaded && row.asset.status.status !== ASSET_STATUS.MISSING,
    )
    if (unresolved.length > 0) {
      throw new ConflictError(
        `${unresolved.length} asset(s) not yet loaded or marked missing on departure ${departureNumber}`,
      )
    }
    if (!departure.asset_departures.some((row) => row.loaded)) {
      throw new ConflictError(`Departure ${departureNumber} has no loaded assets`)
    }
    await tx.departure.update({
      where: { id: departure.id },
      data: { status: DEPARTURE_STATUS.LOADED },
    })
    return departure.id
  })

  await recordDepartureUpdate(
    departureId,
    { status: DEPARTURE_STATUS.LOADING_IN_PROGRESS },
    { status: DEPARTURE_STATUS.LOADED },
    userId,
  )
}

export async function completeDeparture(departureNumber: string, userId: number): Promise<void> {
  const departureId = await prisma.$transaction(async (tx) => {
    const departure = await tx.departure.findUnique({
      where: { departure_number: departureNumber },
      select: { id: true, status: true },
    })
    if (!departure) throw new NotFoundError(`Departure ${departureNumber} not found`)
    if (departure.status !== DEPARTURE_STATUS.LOADED) {
      throw new ConflictError(`Departure ${departureNumber} is not loaded`)
    }
    await tx.departure.update({
      where: { id: departure.id },
      data: { status: DEPARTURE_STATUS.COMPLETE },
    })
    return departure.id
  })

  await recordDepartureUpdate(
    departureId,
    { status: DEPARTURE_STATUS.LOADED },
    { status: DEPARTURE_STATUS.COMPLETE },
    userId,
  )
}

type ReturnedAsset = {
  id: number
  status_id: number
  sales_invoice_id: number | null
  cost: { sale_price: Prisma.Decimal | null } | null
}

// Returned assets may sit on different sales invoices, so record one delta per invoice.
async function recordSalesInvoiceRelease(assets: ReturnedAsset[], userId: number): Promise<void> {
  const invoicedAssets = assets.filter((asset) => asset.sales_invoice_id !== null)
  const assetsByInvoice = Object.groupBy(invoicedAssets, (asset) => asset.sales_invoice_id!)
  for (const [invoiceId, group] of Object.entries(assetsByInvoice)) {
    if (!group) continue
    await recordCollectionAssetDelta(
      'Invoice',
      'sales_invoice_id',
      Number(invoiceId),
      [],
      group.map((asset) => asset.id),
      userId,
    )
  }
}

async function recordSalePriceClear(assets: ReturnedAsset[], userId: number): Promise<void> {
  const pricedAssets = assets.filter((asset) => asset.cost?.sale_price != null)
  await Promise.all(
    pricedAssets.map((asset) =>
      recordAssetUpdate(
        asset.id,
        { sale_price: decimalToNumber(asset.cost!.sale_price) },
        { sale_price: null },
        userId,
      ),
    ),
  )
}

export async function returnDepartureAssetsToStock(
  departureNumber: string,
  assetIds: number[],
  userId: number,
): Promise<void> {
  const inStockStatus = await prisma.status.findUniqueOrThrow({
    where: { status: ASSET_STATUS.IN_STOCK },
    select: { id: true },
  })

  const { departure, priorAssets, reverted } = await prisma.$transaction(async (tx) => {
    const found = await tx.departure.findUnique({
      where: { departure_number: departureNumber },
      select: { id: true, status: true },
    })
    if (!found) throw new NotFoundError(`Departure ${departureNumber} not found`)

    const assets = await tx.asset.findMany({
      where: { id: { in: assetIds }, departure_id: found.id },
      select: {
        id: true,
        barcode: true,
        status_id: true,
        sales_invoice_id: true,
        cost: { select: { sale_price: true } },
        asset_departure: { select: { loaded: true } },
      },
    })
    if (assets.length !== assetIds.length) {
      throw new ConflictError('Some assets do not belong to this departure')
    }
    const notLoaded = assets.filter((asset) => !asset.asset_departure?.loaded)
    if (notLoaded.length > 0) {
      throw new ConflictError(`${NOT_LOADED_MESSAGE} ${notLoaded.map((a) => a.barcode).join(', ')}`)
    }

    await tx.asset.updateMany({
      where: { id: { in: assetIds }, departure_id: found.id },
      data: { departure_id: null, status_id: inStockStatus.id, sales_invoice_id: null },
    })
    await tx.cost.updateMany({
      where: { asset_id: { in: assetIds } },
      data: { sale_price: null },
    })
    await tx.assetDeparture.deleteMany({ where: { asset_id: { in: assetIds } } })

    const remaining = await tx.assetDeparture.count({ where: { departure_id: found.id } })
    const emptied = remaining === 0 && REVERTIBLE_STATUSES.includes(found.status)
    if (emptied) {
      await tx.departure.update({
        where: { id: found.id },
        data: { status: DEPARTURE_STATUS.DRAFT },
      })
    }
    return { departure: found, priorAssets: assets, reverted: emptied }
  })

  await recordCollectionAssetDelta('Departure', 'departure_id', departure.id, [], assetIds, userId)
  await recordAssetStatusChange(priorAssets, inStockStatus.id, userId)
  await recordSalesInvoiceRelease(priorAssets, userId)
  await recordSalePriceClear(priorAssets, userId)
  if (reverted) {
    await recordDepartureUpdate(
      departure.id,
      { status: departure.status },
      { status: DEPARTURE_STATUS.DRAFT },
      userId,
    )
  }
}

type DepartureRelease = {
  removals: { departureId: number; assetIds: number[] }[]
  reverted: { id: number; status: string }[]
}

// Detaches missing assets from whatever departure they are on. Runs inside the caller's
// transaction; history is written afterwards with recordDepartureRelease.
export async function releaseMissingAssetsFromDepartures(
  tx: Prisma.TransactionClient,
  assetIds: number[],
): Promise<DepartureRelease> {
  const rows = await tx.assetDeparture.findMany({
    where: { asset_id: { in: assetIds } },
    select: { asset_id: true, departure_id: true },
  })
  if (rows.length === 0) return { removals: [], reverted: [] }

  const releasedIds = rows.map((row) => row.asset_id)
  await tx.assetDeparture.deleteMany({ where: { asset_id: { in: releasedIds } } })
  await tx.asset.updateMany({
    where: { id: { in: releasedIds } },
    data: { departure_id: null },
  })

  const departureIds = [...new Set(rows.map((row) => row.departure_id))]
  const remainingByDeparture = await tx.assetDeparture.groupBy({
    by: ['departure_id'],
    where: { departure_id: { in: departureIds } },
    _count: { _all: true },
  })
  const occupiedIds = new Set(remainingByDeparture.map((row) => row.departure_id))
  const emptied = await tx.departure.findMany({
    where: {
      id: { in: departureIds.filter((id) => !occupiedIds.has(id)) },
      status: { in: [...REVERTIBLE_STATUSES] },
    },
    select: { id: true, status: true },
  })
  await tx.departure.updateMany({
    where: { id: { in: emptied.map((departure) => departure.id) } },
    data: { status: DEPARTURE_STATUS.DRAFT },
  })

  const rowsByDeparture = Object.groupBy(rows, (row) => row.departure_id)
  return {
    removals: Object.entries(rowsByDeparture).map(([departureId, group]) => ({
      departureId: Number(departureId),
      assetIds: (group ?? []).map((row) => row.asset_id),
    })),
    reverted: emptied,
  }
}

export async function recordDepartureRelease(
  release: DepartureRelease,
  userId: number,
): Promise<void> {
  for (const { departureId, assetIds } of release.removals) {
    await recordCollectionAssetDelta('Departure', 'departure_id', departureId, [], assetIds, userId)
  }
  for (const { id, status } of release.reverted) {
    await recordDepartureUpdate(id, { status }, { status: DEPARTURE_STATUS.DRAFT }, userId)
  }
}

async function getNewDepartureNumber(originCode: string): Promise<string> {
  const sequence = await getNextSequence('departure')
  return `D-${originCode}-${String(sequence).padStart(7, '0')}`
}

export async function deleteDeparture(departureNumber: string, userId: number): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const departure = await tx.departure.findUnique({
      where: { departure_number: departureNumber },
      select: { id: true, status: true, _count: { select: { asset_departures: true } } },
    })
    if (!departure) throw new NotFoundError(`Departure ${departureNumber} not found`)

    if (departure.status !== DEPARTURE_STATUS.DRAFT) {
      throw new ConflictError(`Departure ${departureNumber} cannot be deleted after scheduling`)
    }

    const assetCount = departure._count.asset_departures
    if (assetCount > 0) {
      throw new ConflictError(
        `Departure ${departureNumber} cannot be deleted because it still has ${pluralize(assetCount, 'asset')}`,
      )
    }

    await tx.departure.delete({ where: { id: departure.id } })
  })

  logger.warn('Departure deleted', { departureNumber, userId })
}
