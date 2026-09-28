import {
  ASSET_STATUS,
  ON_HAND_STATUS_VALUES,
  Permission,
  AssetCost,
  AssetDelta,
  CreateTransfer,
  ScheduleTransfer,
  TRANSFER_STATUS,
  TransferCosts,
  TransferDetail,
  TransferSummary,
  UpdateTransferDate,
  UpdateTransferMetadata,
  UpdateTransferNotes,
} from 'shared-types'
import { Prisma } from '../../generated/prisma/client.js'
import {
  getAssetsForTransfers,
  getTransfers as getTransfersDb,
} from '../../generated/prisma/sql.js'
import { COST_SELECT, toAssetCost } from '../lib/asset-cost.js'
import { getNextSequence } from '../lib/db-utils.js'
import { ZERO, totalCostDecimal } from '../lib/decimal.js'
import { ConflictError, NotFoundError } from '../lib/errors.js'
import { logger } from '../lib/logger.js'
import { pluralize } from '../lib/pluralize.js'
import { mapAssetSearchRow } from '../lib/asset-mappers.js'
import { redactSearchRowCost } from '../lib/cost-redaction.js'
import {
  recordAssetStatusChange,
  recordAssetTransferMovement,
  recordAssetUpdate,
  recordAssetUpdateOnCollection,
  recordCollectionUpdateOnAssets,
  recordTransferCreate,
  recordTransferUpdate,
} from './historyService.js'
import {
  getWarehouseTransferCostDecimals,
  type TransferCostDecimals,
} from './transferCostService.js'
import { prisma } from '../prisma.js'

const SHIPPING_AND_RECEIVING_ZONE = 'SHIPPING_AND_RECEIVING'
const UNTESTED_READINESS = 'UNTESTED'
const NOT_MISSING_MESSAGE = 'Only missing assets can be returned to stock:'
const MISSING_WHILE_UNLOADING_MESSAGE =
  'Assets missing during unloading can be returned once their transfer is complete:'
const CONCURRENT_CHANGE_MESSAGE = 'Some assets changed while updating; refresh and try again'

function toYmd(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function toYmdOrNull(date: Date | null): string | null {
  return date === null ? null : toYmd(date)
}

function todayYmd(): string {
  return toYmd(new Date())
}

export async function getTransferSummaries(
  fromDate: Date,
  toDate: Date,
  origin: number,
  destination: number,
): Promise<TransferSummary[]> {
  const rows = await prisma.$queryRawTyped(getTransfersDb(fromDate, toDate, origin, destination))
  return rows.map((row) => ({ ...row, transfer_date: toYmdOrNull(row.transfer_date) }))
}

export async function getTransfer(
  transferNumber: string,
  permissions: ReadonlySet<Permission>,
): Promise<TransferDetail> {
  const [transfer, assets] = await Promise.all([
    prisma.transfer.findUnique({
      where: { transfer_number: transferNumber },
      include: { origin: true, destination: true, transporter: true, created_by: true },
    }),
    prisma.$queryRawTyped(getAssetsForTransfers(transferNumber)),
  ])
  if (!transfer) throw new NotFoundError(`Transfer ${transferNumber} not found`)
  return {
    transfer_number: transfer.transfer_number,
    status: transfer.status,
    origin: transfer.origin,
    destination: transfer.destination,
    transporter: transfer.transporter,
    notes: transfer.notes,
    created_at: transfer.created_at,
    created_by: transfer.created_by?.name,
    transfer_date: toYmdOrNull(transfer.transfer_date),
    assets: assets.map((r) => ({
      ...redactSearchRowCost(mapAssetSearchRow(r), permissions),
      scan: { loaded: r.loaded, unloaded: r.unloaded },
    })),
  }
}

const TRANSFER_ROUTE_SELECT = {
  origin: { select: { city_code: true } },
  destination: { select: { city_code: true } },
} as const

function transferRoute(
  transferNumber: string,
  transfer: { origin: { city_code: string }; destination: { city_code: string } },
) {
  return {
    transfer_number: transferNumber,
    origin_city_code: transfer.origin.city_code,
    destination_city_code: transfer.destination.city_code,
  }
}

export async function createTransfer(transfer: CreateTransfer, userId: number): Promise<string> {
  const originCode = transfer.origin.city_code
  const currentDateTime = new Date()
  const transferNumber = await getNewTransferNumber(originCode)
  const assetIds = transfer.assets.map((a) => a.id)

  const newTransferId = await prisma.$transaction(async (tx) => {
    await assertAssetsNotOnOpenTransfer(tx, assetIds)
    await assertAssetsOnHand(tx, assetIds)
    const created = await tx.transfer.create({
      data: {
        transfer_number: transferNumber,
        origin: { connect: { id: transfer.origin.id } },
        destination: { connect: { id: transfer.destination.id } },
        transporter: { connect: { id: transfer.transporter.id } },
        created_by: { connect: { id: userId } },
        notes: transfer.comment,
        created_at: currentDateTime,
        asset_transfers: {
          create: assetIds.map((assetId) => ({ asset_id: assetId })),
        },
      },
    })
    return created.id
  })

  await recordTransferCreate(
    newTransferId,
    {
      transfer_number: transferNumber,
      origin_id: transfer.origin.id,
      destination_id: transfer.destination.id,
      created_at: currentDateTime,
    },
    userId,
  )

  await recordAssetUpdateOnCollection('Transfer', newTransferId, assetIds, [], userId)
  await recordCollectionUpdateOnAssets([], assetIds, 'transfer_id', newTransferId, userId)

  return transferNumber
}

export async function patchTransferMetadata(
  transferNumber: string,
  metadata: UpdateTransferMetadata,
  userId: number,
): Promise<void> {
  const current = await prisma.$transaction(async (tx) => {
    const transfer = await tx.transfer.findUnique({
      where: { transfer_number: transferNumber },
      select: {
        id: true,
        status: true,
        origin_id: true,
        destination_id: true,
        transporter_id: true,
        notes: true,
      },
    })
    if (!transfer) throw new NotFoundError(`Transfer ${transferNumber} not found`)
    if (transfer.status !== TRANSFER_STATUS.DRAFT) {
      throw new ConflictError(`Transfer ${transferNumber} cannot be edited after dispatch`)
    }
    await tx.transfer.update({
      where: { id: transfer.id },
      data: {
        origin_id: metadata.origin.id,
        destination_id: metadata.destination.id,
        transporter_id: metadata.transporter.id,
        notes: metadata.comment,
      },
    })
    return transfer
  })

  await recordTransferUpdate(
    current.id,
    {
      origin_id: current.origin_id,
      destination_id: current.destination_id,
      transporter_id: current.transporter_id,
    },
    {
      origin_id: metadata.origin.id,
      destination_id: metadata.destination.id,
      transporter_id: metadata.transporter.id,
    },
    userId,
  )
}

export async function patchTransferNotes(
  transferNumber: string,
  notes: UpdateTransferNotes,
): Promise<void> {
  const transfer = await prisma.transfer.findUnique({
    where: { transfer_number: transferNumber },
    select: { id: true },
  })
  if (!transfer) throw new NotFoundError(`Transfer ${transferNumber} not found`)
  await prisma.transfer.update({
    where: { id: transfer.id },
    data: { notes: notes.comment },
  })
}

export async function patchTransferAssets(
  transferNumber: string,
  delta: AssetDelta,
  userId: number,
): Promise<void> {
  const transferId = await prisma.$transaction(async (tx) => {
    const transfer = await tx.transfer.findUnique({
      where: { transfer_number: transferNumber },
      select: { id: true, status: true },
    })
    if (!transfer) throw new NotFoundError(`Transfer ${transferNumber} not found`)
    if (transfer.status !== TRANSFER_STATUS.DRAFT) {
      throw new ConflictError(`Transfer ${transferNumber} cannot be edited after dispatch`)
    }
    await assertAssetsNotOnOpenTransfer(tx, delta.assetIdsToAdd, transfer.id)
    await assertAssetsOnHand(tx, delta.assetIdsToAdd)
    await applyTransferAssetDelta(tx, transfer.id, delta.assetIdsToAdd, delta.assetIdsToRemove)
    return transfer.id
  })

  await recordAssetUpdateOnCollection(
    'Transfer',
    transferId,
    delta.assetIdsToAdd,
    delta.assetIdsToRemove,
    userId,
  )
  await recordCollectionUpdateOnAssets(
    delta.assetIdsToRemove,
    delta.assetIdsToAdd,
    'transfer_id',
    transferId,
    userId,
  )
}

export async function scheduleTransfer(
  transferNumber: string,
  schedule: ScheduleTransfer,
  userId: number,
): Promise<void> {
  const transferId = await prisma.$transaction(async (tx) => {
    const transfer = await tx.transfer.findUnique({
      where: { transfer_number: transferNumber },
      select: { id: true, status: true, _count: { select: { asset_transfers: true } } },
    })
    if (!transfer) throw new NotFoundError(`Transfer ${transferNumber} not found`)
    if (transfer.status !== TRANSFER_STATUS.DRAFT) {
      throw new ConflictError(`Transfer ${transferNumber} has already been scheduled`)
    }
    if (transfer._count.asset_transfers === 0) {
      throw new ConflictError(`Transfer ${transferNumber} has no assets to schedule`)
    }
    await tx.transfer.update({
      where: { id: transfer.id },
      data: { status: TRANSFER_STATUS.SCHEDULED, transfer_date: new Date(schedule.transfer_date) },
    })
    return transfer.id
  })

  await recordTransferUpdate(
    transferId,
    { status: TRANSFER_STATUS.DRAFT, transfer_date: null },
    { status: TRANSFER_STATUS.SCHEDULED, transfer_date: schedule.transfer_date },
    userId,
  )
}

export async function patchTransferDate(
  transferNumber: string,
  update: UpdateTransferDate,
  userId: number,
): Promise<void> {
  const { transferId, previousDate } = await prisma.$transaction(async (tx) => {
    const transfer = await tx.transfer.findUnique({
      where: { transfer_number: transferNumber },
      select: { id: true, status: true, transfer_date: true },
    })
    if (!transfer) throw new NotFoundError(`Transfer ${transferNumber} not found`)
    if (transfer.status !== TRANSFER_STATUS.SCHEDULED) {
      throw new ConflictError(`Transfer ${transferNumber} date can only be edited while scheduled`)
    }
    await tx.transfer.update({
      where: { id: transfer.id },
      data: { transfer_date: new Date(update.transfer_date) },
    })
    return { transferId: transfer.id, previousDate: toYmdOrNull(transfer.transfer_date) }
  })

  await recordTransferUpdate(
    transferId,
    { transfer_date: previousDate },
    { transfer_date: update.transfer_date },
    userId,
  )
}

export async function startLoadingTransfer(transferNumber: string, userId: number): Promise<void> {
  const transferId = await prisma.$transaction(async (tx) => {
    const transfer = await tx.transfer.findUnique({
      where: { transfer_number: transferNumber },
      select: { id: true, status: true, asset_transfers: { select: { asset_id: true } } },
    })
    if (!transfer) throw new NotFoundError(`Transfer ${transferNumber} not found`)
    if (transfer.status !== TRANSFER_STATUS.SCHEDULED) {
      throw new ConflictError(`Transfer ${transferNumber} is not scheduled`)
    }
    // Re-check on hand: an asset's status can change after scheduling (e.g. picked up by a
    // departure elsewhere), and loading must halt rather than load a no-longer-available asset.
    await assertAssetsOnHand(
      tx,
      transfer.asset_transfers.map((at) => at.asset_id),
    )
    await tx.transfer.update({
      where: { id: transfer.id },
      data: { status: TRANSFER_STATUS.LOADING_IN_PROGRESS },
    })
    return transfer.id
  })

  await recordTransferUpdate(
    transferId,
    { status: TRANSFER_STATUS.SCHEDULED },
    { status: TRANSFER_STATUS.LOADING_IN_PROGRESS },
    userId,
  )
}

export async function startUnloadingTransfer(
  transferNumber: string,
  userId: number,
): Promise<void> {
  const transferId = await prisma.$transaction(async (tx) => {
    const transfer = await tx.transfer.findUnique({
      where: { transfer_number: transferNumber },
      select: { id: true, status: true },
    })
    if (!transfer) throw new NotFoundError(`Transfer ${transferNumber} not found`)
    if (transfer.status !== TRANSFER_STATUS.IN_TRANSIT) {
      throw new ConflictError(`Transfer ${transferNumber} is not in transit`)
    }
    await tx.transfer.update({
      where: { id: transfer.id },
      data: { status: TRANSFER_STATUS.UNLOADING_IN_PROGRESS },
    })
    return transfer.id
  })

  await recordTransferUpdate(
    transferId,
    { status: TRANSFER_STATUS.IN_TRANSIT },
    { status: TRANSFER_STATUS.UNLOADING_IN_PROGRESS },
    userId,
  )
}

export async function scanAssetLoadedSer(
  transferNumber: string,
  assetId: number,
  userId: number,
): Promise<void> {
  const { route, priorAsset } = await prisma.$transaction(async (tx) => {
    const transfer = await tx.transfer.findUnique({
      where: { transfer_number: transferNumber },
      select: { id: true, status: true, ...TRANSFER_ROUTE_SELECT },
    })
    if (!transfer) throw new NotFoundError(`Transfer ${transferNumber} not found`)
    if (transfer.status !== TRANSFER_STATUS.LOADING_IN_PROGRESS) {
      throw new ConflictError(`Transfer ${transferNumber} is not loading`)
    }
    const asset = await tx.asset.findUnique({
      where: { id: assetId },
      select: { id: true, barcode: true, location_id: true, status: { select: { status: true } } },
    })
    if (!asset) throw new NotFoundError(`Asset ${assetId} not found`)
    const assetTransfer = await tx.assetTransfer.findUnique({
      where: { asset_id_transfer_id: { asset_id: assetId, transfer_id: transfer.id } },
      select: { asset_id: true },
    })
    if (!assetTransfer) {
      throw new NotFoundError(`Asset ${asset.barcode} not found on transfer ${transferNumber}`)
    }
    if (asset.status.status === ASSET_STATUS.MISSING) {
      throw new ConflictError(`Asset ${asset.barcode} is already marked missing`)
    }
    await tx.assetTransfer.update({
      where: { asset_id_transfer_id: { asset_id: assetId, transfer_id: transfer.id } },
      data: { loaded: true },
    })
    return {
      route: transferRoute(transferNumber, transfer),
      priorAsset: { id: asset.id, location_id: asset.location_id },
    }
  })

  await recordAssetTransferMovement(
    'TRANSFER_ASSET_LOADED',
    route,
    [priorAsset],
    priorAsset.location_id,
    userId,
  )
}

export async function markAssetMissingAtLoadSer(
  transferNumber: string,
  assetId: number,
  userId: number,
): Promise<void> {
  const { route, priorAsset, missingStatusId } = await prisma.$transaction(async (tx) => {
    const transfer = await tx.transfer.findUnique({
      where: { transfer_number: transferNumber },
      select: { id: true, status: true, ...TRANSFER_ROUTE_SELECT },
    })
    if (!transfer) throw new NotFoundError(`Transfer ${transferNumber} not found`)
    if (transfer.status !== TRANSFER_STATUS.LOADING_IN_PROGRESS) {
      throw new ConflictError(`Transfer ${transferNumber} is not loading`)
    }
    const asset = await tx.asset.findUnique({
      where: { id: assetId },
      select: { id: true, barcode: true, status_id: true, location_id: true },
    })
    if (!asset) throw new NotFoundError(`Asset ${assetId} not found`)
    const assetTransfer = await tx.assetTransfer.findUnique({
      where: { asset_id_transfer_id: { asset_id: assetId, transfer_id: transfer.id } },
      select: { loaded: true },
    })
    if (!assetTransfer) {
      throw new NotFoundError(`Asset ${asset.barcode} not found on transfer ${transferNumber}`)
    }
    if (assetTransfer.loaded) {
      throw new ConflictError(`Asset ${asset.barcode} is already loaded`)
    }
    const missingStatus = await tx.status.findUnique({ where: { status: ASSET_STATUS.MISSING } })
    if (!missingStatus) throw new Error(`Status ${ASSET_STATUS.MISSING} not seeded in DB`)
    await tx.asset.update({ where: { id: assetId }, data: { status_id: missingStatus.id } })
    return {
      route: transferRoute(transferNumber, transfer),
      priorAsset: asset,
      missingStatusId: missingStatus.id,
    }
  })

  await recordAssetStatusChange([priorAsset], missingStatusId, userId)
  await recordAssetTransferMovement(
    'TRANSFER_ASSET_MARKED_MISSING',
    route,
    [priorAsset],
    priorAsset.location_id,
    userId,
  )
}

// Corrects a mis-scan during Loading In Progress: puts the asset back in the Pending pane.
export async function undoAssetLoadSer(
  transferNumber: string,
  assetId: number,
  userId: number,
): Promise<void> {
  const { route, priorAsset } = await prisma.$transaction(async (tx) => {
    const transfer = await tx.transfer.findUnique({
      where: { transfer_number: transferNumber },
      select: { id: true, status: true, ...TRANSFER_ROUTE_SELECT },
    })
    if (!transfer) throw new NotFoundError(`Transfer ${transferNumber} not found`)
    if (transfer.status !== TRANSFER_STATUS.LOADING_IN_PROGRESS) {
      throw new ConflictError(`Transfer ${transferNumber} is not loading`)
    }
    const asset = await tx.asset.findUnique({
      where: { id: assetId },
      select: { id: true, barcode: true, location_id: true },
    })
    if (!asset) throw new NotFoundError(`Asset ${assetId} not found`)
    const assetTransfer = await tx.assetTransfer.findUnique({
      where: { asset_id_transfer_id: { asset_id: assetId, transfer_id: transfer.id } },
      select: { loaded: true },
    })
    if (!assetTransfer) {
      throw new NotFoundError(`Asset ${asset.barcode} not found on transfer ${transferNumber}`)
    }
    if (!assetTransfer.loaded) {
      throw new ConflictError(`Asset ${asset.barcode} is not loaded`)
    }
    await tx.assetTransfer.update({
      where: { asset_id_transfer_id: { asset_id: assetId, transfer_id: transfer.id } },
      data: { loaded: false },
    })
    return { route: transferRoute(transferNumber, transfer), priorAsset: asset }
  })

  await recordAssetTransferMovement(
    'TRANSFER_ASSET_LOAD_UNDONE',
    route,
    [priorAsset],
    priorAsset.location_id,
    userId,
  )
}

function toCostDecimals(costs: TransferCosts): TransferCostDecimals {
  return {
    transfer_cost: new Prisma.Decimal(costs.transfer_cost),
    processing_cost: new Prisma.Decimal(costs.processing_cost),
    tested_processing_cost: new Prisma.Decimal(costs.tested_processing_cost),
    other_cost: new Prisma.Decimal(costs.other_cost),
  }
}

// A machine counts as tested once its readiness has moved off UNTESTED, errors included.
async function loadTestedAssetIds(
  tx: Prisma.TransactionClient,
  assetIds: number[],
): Promise<Set<number>> {
  const tested = await tx.asset.findMany({
    where: { id: { in: assetIds }, readiness: { status: { not: UNTESTED_READINESS } } },
    select: { id: true },
  })
  return new Set(tested.map((asset) => asset.id))
}

type AssetCostChange = { assetId: number; prevCost: AssetCost; newCost: AssetCost }

// Every machine on the transfer carries the full per-machine amount, added on top of what it
// already cost, and a tested machine carries the extra processing charge as well; the total is
// re-derived from the components afterwards.
async function applyTransferCostsToAssets(
  tx: Prisma.TransactionClient,
  assetIds: number[],
  costs: TransferCostDecimals,
): Promise<AssetCostChange[]> {
  const testedAssetIds = await loadTestedAssetIds(tx, assetIds)
  const rows = await tx.cost.findMany({
    where: { asset_id: { in: assetIds } },
    select: { asset_id: true, ...COST_SELECT },
  })
  const rowByAssetId = new Map(rows.map(({ asset_id, ...cost }) => [asset_id, cost]))

  const changes: AssetCostChange[] = []
  for (const assetId of assetIds) {
    const row = rowByAssetId.get(assetId) ?? null
    const addedProcessing = testedAssetIds.has(assetId)
      ? costs.processing_cost.add(costs.tested_processing_cost)
      : costs.processing_cost
    const components = {
      transfer_cost: (row?.transfer_cost ?? ZERO).add(costs.transfer_cost),
      processing_cost: (row?.processing_cost ?? ZERO).add(addedProcessing),
      other_cost: (row?.other_cost ?? ZERO).add(costs.other_cost),
    }
    const total_cost = totalCostDecimal({ ...row, ...components })
    const data = { ...components, total_cost }

    await tx.cost.upsert({
      where: { asset_id: assetId },
      update: data,
      create: { asset_id: assetId, ...data },
    })

    const prevCost = toAssetCost(row)
    changes.push({
      assetId,
      prevCost,
      newCost: {
        ...prevCost,
        transfer_cost: components.transfer_cost.toNumber(),
        processing_cost: components.processing_cost.toNumber(),
        other_cost: components.other_cost.toNumber(),
        total_cost: total_cost.toNumber(),
      },
    })
  }
  return changes
}

export async function departTransfer(
  transferNumber: string,
  userId: number,
  costs: TransferCosts | null,
): Promise<void> {
  const { transferId, route, costChanges, priorAssets, previousDate, newTransferDate } =
    await prisma.$transaction(async (tx) => {
      const transfer = await tx.transfer.findUnique({
        where: { transfer_number: transferNumber },
        select: {
          id: true,
          status: true,
          origin_id: true,
          transfer_date: true,
          ...TRANSFER_ROUTE_SELECT,
          asset_transfers: {
            select: {
              asset_id: true,
              loaded: true,
              asset: { select: { status: { select: { status: true } } } },
            },
          },
        },
      })
      if (!transfer) throw new NotFoundError(`Transfer ${transferNumber} not found`)
      if (transfer.status !== TRANSFER_STATUS.LOADING_IN_PROGRESS) {
        throw new ConflictError(`Transfer ${transferNumber} is not loading`)
      }
      const unresolved = transfer.asset_transfers.filter(
        (at) => !at.loaded && at.asset.status.status !== ASSET_STATUS.MISSING,
      )
      if (unresolved.length > 0) {
        throw new ConflictError(
          `${pluralize(unresolved.length, 'asset')} not yet scanned or marked missing on transfer ${transferNumber}`,
        )
      }
      const travelingAssetIds = transfer.asset_transfers
        .filter((at) => at.loaded)
        .map((at) => at.asset_id)
      const appliedCosts =
        costs === null
          ? await getWarehouseTransferCostDecimals(tx, transfer.origin_id)
          : toCostDecimals(costs)
      const newTransferDate = todayYmd()

      await tx.transfer.update({
        where: { id: transfer.id },
        data: {
          status: TRANSFER_STATUS.IN_TRANSIT,
          transfer_date: new Date(newTransferDate),
          ...appliedCosts,
        },
      })
      const priorAssets = await tx.asset.findMany({
        where: { id: { in: travelingAssetIds } },
        select: { id: true, location_id: true },
      })
      await tx.asset.updateMany({
        where: { id: { in: travelingAssetIds } },
        data: { location_id: null, is_in_transit: true },
      })
      const costChanges = await applyTransferCostsToAssets(tx, travelingAssetIds, appliedCosts)
      return {
        transferId: transfer.id,
        route: transferRoute(transferNumber, transfer),
        costChanges,
        priorAssets,
        previousDate: toYmdOrNull(transfer.transfer_date),
        newTransferDate,
      }
    })

  await recordTransferUpdate(
    transferId,
    { status: TRANSFER_STATUS.LOADING_IN_PROGRESS, transfer_date: previousDate },
    { status: TRANSFER_STATUS.IN_TRANSIT, transfer_date: newTransferDate },
    userId,
  )
  await recordAssetTransferMovement('TRANSFER_DISPATCHED', route, priorAssets, null, userId)
  await Promise.all(
    costChanges.map(({ assetId, prevCost, newCost }) =>
      recordAssetUpdate(assetId, prevCost, newCost, userId),
    ),
  )
}

export async function scanAssetUnloadedSer(
  transferNumber: string,
  assetId: number,
  userId: number,
): Promise<void> {
  const { route, priorAsset, locationId } = await prisma.$transaction(async (tx) => {
    const transfer = await tx.transfer.findUnique({
      where: { transfer_number: transferNumber },
      select: { id: true, status: true, destination_id: true, ...TRANSFER_ROUTE_SELECT },
    })
    if (!transfer) throw new NotFoundError(`Transfer ${transferNumber} not found`)
    if (transfer.status !== TRANSFER_STATUS.UNLOADING_IN_PROGRESS) {
      throw new ConflictError(`Transfer ${transferNumber} is not unloading`)
    }
    const asset = await tx.asset.findUnique({
      where: { id: assetId },
      select: { id: true, barcode: true, location_id: true, status: { select: { status: true } } },
    })
    if (!asset) throw new NotFoundError(`Asset ${assetId} not found`)
    const assetTransfer = await tx.assetTransfer.findUnique({
      where: { asset_id_transfer_id: { asset_id: assetId, transfer_id: transfer.id } },
      select: { loaded: true, unloaded: true },
    })
    if (!assetTransfer) {
      throw new NotFoundError(`Asset ${asset.barcode} not found on transfer ${transferNumber}`)
    }
    if (!assetTransfer.loaded) {
      throw new ConflictError(`Asset ${asset.barcode} never traveled on transfer ${transferNumber}`)
    }
    if (assetTransfer.unloaded || asset.status.status === ASSET_STATUS.MISSING) {
      throw new ConflictError(`Asset ${asset.barcode} is already resolved`)
    }
    const locationId = await resolveShippingAndReceivingLocationId(tx, transfer.destination_id)
    await tx.asset.update({
      where: { id: assetId },
      data: { location_id: locationId, is_in_transit: false },
    })
    await tx.assetTransfer.update({
      where: { asset_id_transfer_id: { asset_id: assetId, transfer_id: transfer.id } },
      data: { unloaded: true },
    })
    return {
      route: transferRoute(transferNumber, transfer),
      priorAsset: { id: asset.id, location_id: asset.location_id },
      locationId,
    }
  })

  await recordAssetTransferMovement(
    'TRANSFER_ASSET_UNLOADED',
    route,
    [priorAsset],
    locationId,
    userId,
  )
}

export async function markAssetMissingAtUnloadSer(
  transferNumber: string,
  assetId: number,
  userId: number,
): Promise<void> {
  const { route, priorAsset, missingStatusId, locationId } = await prisma.$transaction(
    async (tx) => {
      const transfer = await tx.transfer.findUnique({
        where: { transfer_number: transferNumber },
        select: { id: true, status: true, destination_id: true, ...TRANSFER_ROUTE_SELECT },
      })
      if (!transfer) throw new NotFoundError(`Transfer ${transferNumber} not found`)
      if (transfer.status !== TRANSFER_STATUS.UNLOADING_IN_PROGRESS) {
        throw new ConflictError(`Transfer ${transferNumber} is not unloading`)
      }
      const asset = await tx.asset.findUnique({
        where: { id: assetId },
        select: { id: true, barcode: true, status_id: true, location_id: true },
      })
      if (!asset) throw new NotFoundError(`Asset ${assetId} not found`)
      const assetTransfer = await tx.assetTransfer.findUnique({
        where: { asset_id_transfer_id: { asset_id: assetId, transfer_id: transfer.id } },
        select: { loaded: true, unloaded: true },
      })
      if (!assetTransfer) {
        throw new NotFoundError(`Asset ${asset.barcode} not found on transfer ${transferNumber}`)
      }
      if (!assetTransfer.loaded) {
        throw new ConflictError(
          `Asset ${asset.barcode} never traveled on transfer ${transferNumber}`,
        )
      }
      if (assetTransfer.unloaded) {
        throw new ConflictError(`Asset ${asset.barcode} is already unloaded`)
      }
      const locationId = await resolveShippingAndReceivingLocationId(tx, transfer.destination_id)
      const missingStatus = await tx.status.findUnique({ where: { status: ASSET_STATUS.MISSING } })
      if (!missingStatus) throw new Error(`Status ${ASSET_STATUS.MISSING} not seeded in DB`)
      await tx.asset.update({
        where: { id: assetId },
        data: { location_id: locationId, is_in_transit: false, status_id: missingStatus.id },
      })
      return {
        route: transferRoute(transferNumber, transfer),
        priorAsset: asset,
        missingStatusId: missingStatus.id,
        locationId,
      }
    },
  )

  await recordAssetStatusChange([priorAsset], missingStatusId, userId)
  await recordAssetTransferMovement(
    'TRANSFER_ASSET_MARKED_MISSING',
    route,
    [priorAsset],
    locationId,
    userId,
  )
}

// Corrects a mis-scan during Unloading In Progress: restores the in-transit state and puts the
// asset back in the Pending pane.
export async function undoAssetUnloadSer(
  transferNumber: string,
  assetId: number,
  userId: number,
): Promise<void> {
  const { route, priorAsset } = await prisma.$transaction(async (tx) => {
    const transfer = await tx.transfer.findUnique({
      where: { transfer_number: transferNumber },
      select: { id: true, status: true, ...TRANSFER_ROUTE_SELECT },
    })
    if (!transfer) throw new NotFoundError(`Transfer ${transferNumber} not found`)
    if (transfer.status !== TRANSFER_STATUS.UNLOADING_IN_PROGRESS) {
      throw new ConflictError(`Transfer ${transferNumber} is not unloading`)
    }
    const asset = await tx.asset.findUnique({
      where: { id: assetId },
      select: { id: true, barcode: true, location_id: true },
    })
    if (!asset) throw new NotFoundError(`Asset ${assetId} not found`)
    const assetTransfer = await tx.assetTransfer.findUnique({
      where: { asset_id_transfer_id: { asset_id: assetId, transfer_id: transfer.id } },
      select: { unloaded: true },
    })
    if (!assetTransfer) {
      throw new NotFoundError(`Asset ${asset.barcode} not found on transfer ${transferNumber}`)
    }
    if (!assetTransfer.unloaded) {
      throw new ConflictError(`Asset ${asset.barcode} is not unloaded`)
    }
    await tx.asset.update({
      where: { id: assetId },
      data: { location_id: null, is_in_transit: true },
    })
    await tx.assetTransfer.update({
      where: { asset_id_transfer_id: { asset_id: assetId, transfer_id: transfer.id } },
      data: { unloaded: false },
    })
    return { route: transferRoute(transferNumber, transfer), priorAsset: asset }
  })

  await recordAssetTransferMovement(
    'TRANSFER_ASSET_UNLOAD_UNDONE',
    route,
    [priorAsset],
    null,
    userId,
  )
}

export async function completeTransfer(transferNumber: string, userId: number): Promise<void> {
  const transferId = await prisma.$transaction(async (tx) => {
    const transfer = await tx.transfer.findUnique({
      where: { transfer_number: transferNumber },
      select: {
        id: true,
        status: true,
        asset_transfers: {
          select: {
            loaded: true,
            unloaded: true,
            asset: { select: { status: { select: { status: true } } } },
          },
        },
      },
    })
    if (!transfer) throw new NotFoundError(`Transfer ${transferNumber} not found`)
    if (transfer.status !== TRANSFER_STATUS.UNLOADING_IN_PROGRESS) {
      throw new ConflictError(`Transfer ${transferNumber} is not unloading`)
    }
    const unresolved = transfer.asset_transfers.filter(
      (at) => at.loaded && !at.unloaded && at.asset.status.status !== ASSET_STATUS.MISSING,
    )
    if (unresolved.length > 0) {
      throw new ConflictError(
        `${pluralize(unresolved.length, 'asset')} not yet scanned or marked missing on transfer ${transferNumber}`,
      )
    }
    await tx.transfer.update({
      where: { id: transfer.id },
      data: { status: TRANSFER_STATUS.COMPLETE },
    })
    return transfer.id
  })

  await recordTransferUpdate(
    transferId,
    { status: TRANSFER_STATUS.UNLOADING_IN_PROGRESS },
    { status: TRANSFER_STATUS.COMPLETE },
    userId,
  )
}

export async function returnTransferAssetsToOrigin(
  transferNumber: string,
  assetIds: number[],
  userId: number,
): Promise<void> {
  const returnResult = await prisma.$transaction(async (tx) => {
    const transfer = await tx.transfer.findUnique({
      where: { transfer_number: transferNumber },
      select: {
        id: true,
        status: true,
        origin_id: true,
        ...TRANSFER_ROUTE_SELECT,
        asset_transfers: { select: { asset_id: true } },
      },
    })
    if (!transfer) throw new NotFoundError(`Transfer ${transferNumber} not found`)
    if (transfer.status !== TRANSFER_STATUS.IN_TRANSIT) {
      throw new ConflictError(`Transfer ${transferNumber} is not in transit`)
    }
    const transferAssetIds = transfer.asset_transfers.map((a) => a.asset_id)
    const onTransfer = new Set(transferAssetIds)
    if (assetIds.some((id) => !onTransfer.has(id))) {
      throw new ConflictError(`Some assets are not on transfer ${transferNumber}`)
    }

    const locationId = await resolveShippingAndReceivingLocationId(tx, transfer.origin_id)
    const priorAssets = await tx.asset.findMany({
      where: { id: { in: assetIds } },
      select: { id: true, location_id: true },
    })
    await tx.asset.updateMany({
      where: { id: { in: assetIds } },
      data: { location_id: locationId, is_in_transit: false },
    })
    await applyTransferAssetDelta(tx, transfer.id, [], assetIds)

    const returned = new Set(assetIds)
    const revertedToDraft = transferAssetIds.every((id) => returned.has(id))
    if (revertedToDraft) {
      await tx.transfer.update({
        where: { id: transfer.id },
        data: { status: TRANSFER_STATUS.DRAFT },
      })
    }
    return {
      transferId: transfer.id,
      route: transferRoute(transferNumber, transfer),
      revertedToDraft,
      locationId,
      priorAssets,
    }
  })
  const { transferId, route, revertedToDraft, locationId, priorAssets } = returnResult

  await recordAssetUpdateOnCollection('Transfer', transferId, [], assetIds, userId)
  await recordAssetTransferMovement('TRANSFER_RETURNED', route, priorAssets, locationId, userId)
  if (revertedToDraft) {
    await recordTransferUpdate(
      transferId,
      { status: TRANSFER_STATUS.IN_TRANSIT },
      { status: TRANSFER_STATUS.DRAFT },
      userId,
    )
  }
}

export async function returnMissingAssetsToStock(
  assetIds: number[],
  userId: number,
): Promise<void> {
  const inStockStatus = await prisma.status.findUniqueOrThrow({
    where: { status: ASSET_STATUS.IN_STOCK },
    select: { id: true },
  })

  const { priorAssets, removedAssetIdsByTransfer, revertedTransfers } = await prisma.$transaction(
    async (tx) => {
      const assets = await tx.asset.findMany({
        where: { id: { in: assetIds } },
        select: { id: true, barcode: true, status_id: true, status: { select: { status: true } } },
      })
      if (assets.length !== assetIds.length) throw new NotFoundError('Some assets not found')

      const notMissing = assets.filter((a) => a.status.status !== ASSET_STATUS.MISSING)
      if (notMissing.length > 0) {
        throw new ConflictError(
          `${NOT_MISSING_MESSAGE} ${notMissing.map((a) => a.barcode).join(', ')}`,
        )
      }

      const openTransferRows = await tx.assetTransfer.findMany({
        where: {
          asset_id: { in: assetIds },
          transfer: { status: { not: TRANSFER_STATUS.COMPLETE } },
        },
        select: { asset_id: true, transfer_id: true, loaded: true },
      })
      const barcodeById = new Map(assets.map((a) => [a.id, a.barcode]))
      const missingWhileUnloading = openTransferRows.filter((row) => row.loaded)
      if (missingWhileUnloading.length > 0) {
        throw new ConflictError(
          `${MISSING_WHILE_UNLOADING_MESSAGE} ${missingWhileUnloading
            .map((row) => barcodeById.get(row.asset_id))
            .join(', ')}`,
        )
      }

      const updated = await tx.asset.updateMany({
        where: { id: { in: assetIds }, status: { status: ASSET_STATUS.MISSING } },
        data: { status_id: inStockStatus.id },
      })
      if (updated.count !== assetIds.length) throw new ConflictError(CONCURRENT_CHANGE_MESSAGE)

      const affectedTransferIds = [...new Set(openTransferRows.map((row) => row.transfer_id))]
      await tx.assetTransfer.deleteMany({
        where: {
          OR: openTransferRows.map((row) => ({
            asset_id: row.asset_id,
            transfer_id: row.transfer_id,
          })),
        },
      })
      const remainingByTransfer = await tx.assetTransfer.groupBy({
        by: ['transfer_id'],
        where: { transfer_id: { in: affectedTransferIds } },
        _count: { _all: true },
      })
      const nonEmptyTransferIds = new Set(remainingByTransfer.map((row) => row.transfer_id))
      const emptiedTransferIds = affectedTransferIds.filter((id) => !nonEmptyTransferIds.has(id))
      const revertedTransfers = await tx.transfer.findMany({
        where: { id: { in: emptiedTransferIds } },
        select: { id: true, status: true },
      })
      await tx.transfer.updateMany({
        where: { id: { in: emptiedTransferIds } },
        data: { status: TRANSFER_STATUS.DRAFT },
      })

      const removedRowsByTransfer = Object.groupBy(openTransferRows, (row) => row.transfer_id)
      const removedAssetIdsByTransfer = Object.entries(removedRowsByTransfer).map(
        ([transferId, rows]) => ({
          transferId: Number(transferId),
          assetIds: (rows ?? []).map((row) => row.asset_id),
        }),
      )
      return { priorAssets: assets, removedAssetIdsByTransfer, revertedTransfers }
    },
  )

  await recordAssetStatusChange(priorAssets, inStockStatus.id, userId)
  for (const { transferId, assetIds: removedAssetIds } of removedAssetIdsByTransfer) {
    await recordAssetUpdateOnCollection('Transfer', transferId, [], removedAssetIds, userId)
    await recordCollectionUpdateOnAssets(
      [...removedAssetIds],
      [],
      'transfer_id',
      transferId,
      userId,
    )
  }
  for (const { id, status } of revertedTransfers) {
    await recordTransferUpdate(id, { status }, { status: TRANSFER_STATUS.DRAFT }, userId)
  }
}

async function resolveShippingAndReceivingLocationId(
  tx: Prisma.TransactionClient,
  warehouseId: number,
): Promise<number> {
  const zone = await tx.zone.findUnique({
    where: { zone: SHIPPING_AND_RECEIVING_ZONE },
    select: { id: true },
  })
  if (!zone) throw new NotFoundError(`Zone ${SHIPPING_AND_RECEIVING_ZONE} not found`)
  const location = await tx.location.findUnique({
    where: {
      warehouse_id_zone_id_bin: { warehouse_id: warehouseId, zone_id: zone.id, bin: '' },
    },
    select: { id: true },
  })
  if (!location) {
    throw new NotFoundError(
      `${SHIPPING_AND_RECEIVING_ZONE} location for warehouse ${warehouseId} not found`,
    )
  }
  return location.id
}

async function assertAssetsNotOnOpenTransfer(
  tx: Prisma.TransactionClient,
  assetIds: number[],
  excludeTransferId?: number,
): Promise<void> {
  if (assetIds.length === 0) return
  const conflicts = await tx.assetTransfer.findMany({
    where: {
      asset_id: { in: assetIds },
      transfer: {
        status: { not: TRANSFER_STATUS.COMPLETE },
        ...(excludeTransferId !== undefined ? { id: { not: excludeTransferId } } : {}),
      },
    },
    select: {
      asset: { select: { barcode: true } },
      transfer: { select: { transfer_number: true } },
    },
  })
  if (conflicts.length > 0) {
    const detail = conflicts
      .map((c) => `${c.asset.barcode} (on ${c.transfer.transfer_number})`)
      .join(', ')
    throw new ConflictError(`Already on an open transfer: ${detail}`)
  }
}

const ON_HAND_STATUSES: readonly string[] = ON_HAND_STATUS_VALUES

async function assertAssetsOnHand(tx: Prisma.TransactionClient, assetIds: number[]): Promise<void> {
  if (assetIds.length === 0) return
  const assets = await tx.asset.findMany({
    where: { id: { in: assetIds } },
    select: { barcode: true, status: { select: { status: true } } },
  })
  const notOnHand = assets.filter((asset) => !ON_HAND_STATUSES.includes(asset.status.status))
  if (notOnHand.length > 0) {
    const detail = notOnHand.map((asset) => `${asset.barcode} (${asset.status.status})`).join(', ')
    throw new ConflictError(`Not in stock or held, cannot be on a transfer: ${detail}`)
  }
}

async function applyTransferAssetDelta(
  tx: Prisma.TransactionClient,
  transferId: number,
  assetIdsToAdd: number[],
  assetIdsToRemove: number[],
): Promise<void> {
  if (assetIdsToRemove.length > 0) {
    await tx.assetTransfer.deleteMany({
      where: { transfer_id: transferId, asset_id: { in: assetIdsToRemove } },
    })
  }

  if (assetIdsToAdd.length > 0) {
    await tx.assetTransfer.createMany({
      data: assetIdsToAdd.map((assetId) => ({ transfer_id: transferId, asset_id: assetId })),
    })
  }
}

export async function deleteTransfer(transferNumber: string, userId: number): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const transfer = await tx.transfer.findUnique({
      where: { transfer_number: transferNumber },
      select: { id: true, status: true, _count: { select: { asset_transfers: true } } },
    })
    if (!transfer) throw new NotFoundError(`Transfer ${transferNumber} not found`)

    if (transfer.status !== TRANSFER_STATUS.DRAFT) {
      throw new ConflictError(`Transfer ${transferNumber} cannot be deleted after dispatch`)
    }

    const assetCount = transfer._count.asset_transfers
    if (assetCount > 0) {
      throw new ConflictError(
        `Transfer ${transferNumber} cannot be deleted because it still has ${pluralize(assetCount, 'asset')}`,
      )
    }

    await tx.transfer.delete({ where: { id: transfer.id } })
  })

  logger.warn('Transfer deleted', { transferNumber, userId })
}

async function getNewTransferNumber(originCode: string): Promise<string> {
  const sequence = await getNextSequence('transfer')
  return `T-${originCode}-${String(sequence).padStart(7, '0')}`
}
