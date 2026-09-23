import {
  Permission,
  AssetCost,
  AssetDelta,
  CreateTransfer,
  TRANSFER_STATUS,
  TransferCosts,
  TransferDetail,
  UpdateTransferMetadata,
  UpdateTransferNotes,
} from 'shared-types'
import { Prisma } from '../../generated/prisma/client.js'
import { getAssetsForTransfers } from '../../generated/prisma/sql.js'
import { COST_SELECT, toAssetCost } from '../lib/asset-cost.js'
import { getNextSequence } from '../lib/db-utils.js'
import { ZERO, totalCostDecimal } from '../lib/decimal.js'
import { ConflictError, NotFoundError } from '../lib/errors.js'
import { logger } from '../lib/logger.js'
import { pluralize } from '../lib/pluralize.js'
import { mapAssetSearchRow } from '../lib/asset-mappers.js'
import { redactSearchRowCost } from '../lib/cost-redaction.js'
import {
  recordAssetUpdate,
  recordAssetUpdateOnCollection,
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
    assets: assets.map((r) => redactSearchRowCost(mapAssetSearchRow(r), permissions)),
  }
}

export async function createTransfer(transfer: CreateTransfer, userId: number): Promise<string> {
  const originCode = transfer.origin.city_code
  const currentDateTime = new Date()
  const transferNumber = await getNewTransferNumber(originCode)
  const assetIds = transfer.assets.map((a) => a.id)

  const newTransferId = await prisma.$transaction(async (tx) => {
    await assertAssetsNotOnOpenTransfer(tx, assetIds)
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

export async function dispatchTransfer(
  transferNumber: string,
  userId: number,
  costs: TransferCosts | null,
): Promise<void> {
  const { transferId, costChanges } = await prisma.$transaction(async (tx) => {
    const transfer = await tx.transfer.findUnique({
      where: { transfer_number: transferNumber },
      select: {
        id: true,
        status: true,
        origin_id: true,
        asset_transfers: { select: { asset_id: true } },
      },
    })
    if (!transfer) throw new NotFoundError(`Transfer ${transferNumber} not found`)
    if (transfer.status !== TRANSFER_STATUS.DRAFT) {
      throw new ConflictError(`Transfer ${transferNumber} has already been dispatched`)
    }
    const assetIds = transfer.asset_transfers.map((a) => a.asset_id)
    if (assetIds.length === 0) {
      throw new ConflictError(`Transfer ${transferNumber} has no assets to dispatch`)
    }
    const appliedCosts =
      costs === null
        ? await getWarehouseTransferCostDecimals(tx, transfer.origin_id)
        : toCostDecimals(costs)

    await tx.transfer.update({
      where: { id: transfer.id },
      data: { status: TRANSFER_STATUS.IN_TRANSIT, ...appliedCosts },
    })
    await tx.asset.updateMany({
      where: { id: { in: assetIds } },
      data: { location_id: null, is_in_transit: true },
    })
    const costChanges = await applyTransferCostsToAssets(tx, assetIds, appliedCosts)
    return { transferId: transfer.id, costChanges }
  })

  await recordTransferUpdate(
    transferId,
    { status: TRANSFER_STATUS.DRAFT },
    { status: TRANSFER_STATUS.IN_TRANSIT },
    userId,
  )
  await Promise.all(
    costChanges.map(({ assetId, prevCost, newCost }) =>
      recordAssetUpdate(assetId, prevCost, newCost, userId),
    ),
  )
}

export async function receiveTransfer(transferNumber: string, userId: number): Promise<void> {
  const transferId = await prisma.$transaction(async (tx) => {
    const transfer = await tx.transfer.findUnique({
      where: { transfer_number: transferNumber },
      select: {
        id: true,
        status: true,
        destination_id: true,
        asset_transfers: { select: { asset_id: true } },
      },
    })
    if (!transfer) throw new NotFoundError(`Transfer ${transferNumber} not found`)
    if (transfer.status !== TRANSFER_STATUS.IN_TRANSIT) {
      throw new ConflictError(`Transfer ${transferNumber} is not in transit`)
    }
    const locationId = await resolveShippingAndReceivingLocationId(tx, transfer.destination_id)
    const assetIds = transfer.asset_transfers.map((a) => a.asset_id)
    await tx.transfer.update({
      where: { id: transfer.id },
      data: { status: TRANSFER_STATUS.COMPLETE },
    })
    await tx.asset.updateMany({
      where: { id: { in: assetIds } },
      data: { location_id: locationId, is_in_transit: false },
    })
    return transfer.id
  })

  await recordTransferUpdate(
    transferId,
    { status: TRANSFER_STATUS.IN_TRANSIT },
    { status: TRANSFER_STATUS.COMPLETE },
    userId,
  )
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
