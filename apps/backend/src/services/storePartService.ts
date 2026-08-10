import {
  RecordStoreTransaction,
  StoreTransactionKind,
  StoreTransactionResponse,
  AddStorePartToAsset,
  AssetStorePartRow,
  StorePartDetail,
} from 'shared-types'
import { Prisma } from '../../generated/prisma/client.js'
import {
  getAssetStoreParts as getAssetStorePartsDb,
  getStorePartLedger,
  getStorePartOnHand as getStorePartOnHandDb,
  getStorePartStockLayers as getStorePartStockLayersDb,
  getStoreParts as getStorePartsDb,
  getStoreStockLayers as getStoreStockLayersDb,
} from '../../generated/prisma/sql.js'
import { getNextSequence } from '../lib/db-utils.js'
import { decimalToNumber } from '../lib/decimal.js'
import { ConflictError, NotFoundError } from '../lib/errors.js'
import {
  consumptionCost,
  stockByWarehouse,
  stockValue,
  type StockLayer,
} from '../lib/store-part-fifo.js'
import { prisma } from '../prisma.js'

const USED_TYPE = 'USED'
const ZERO_COST = new Prisma.Decimal(0)
const UNIT_COST_DECIMAL_PLACES = 2

const STORE_TRANSACTION_TYPE_BY_KIND = {
  PURCHASE: { type: 'PURCHASE', is_inbound: true },
  SALE: { type: 'SALE', is_inbound: false },
} as const satisfies Record<StoreTransactionKind, { type: string; is_inbound: boolean }>

function stockLayerKey(storePartId: number, warehouseId: number): string {
  return `${storePartId}:${warehouseId}`
}

export async function getStoreParts(canViewCost: boolean) {
  const [rows, layerRows] = await Promise.all([
    prisma.$queryRawTyped(getStorePartsDb()),
    prisma.$queryRawTyped(getStoreStockLayersDb()),
  ])

  const layersByPartWarehouse = new Map<string, StockLayer[]>()
  for (const layer of layerRows) {
    const key = stockLayerKey(layer.store_part_id, layer.warehouse_id)
    const layers = layersByPartWarehouse.get(key)
    if (layers) layers.push(layer)
    else layersByPartWarehouse.set(key, [layer])
  }

  return rows.map((row) => {
    const layers = layersByPartWarehouse.get(stockLayerKey(row.id, row.warehouse_id)) ?? []
    return {
      ...row,
      stock_value: canViewCost ? stockValue(layers, row.on_hand ?? 0).toNumber() : null,
    }
  })
}

export async function getStorePart(partId: number, canViewCost: boolean): Promise<StorePartDetail> {
  const part = await prisma.storePart.findUnique({
    where: { id: partId },
    select: { id: true, part_number: true, description: true },
  })
  if (!part) throw new NotFoundError(`Part ${partId} not found`)

  const rows = await prisma.$queryRawTyped(getStorePartLedger(partId))
  return {
    id: part.id,
    part_number: part.part_number,
    description: part.description,
    stock: stockByWarehouse(rows).map((entry) => ({
      warehouse_id: entry.warehouse_id,
      on_hand: entry.on_hand,
      stock_value: canViewCost ? entry.stock_value.toNumber() : null,
    })),
    transactions: rows.map((row) => ({
      ...row,
      unit_cost: canViewCost ? decimalToNumber(row.unit_cost) : null,
    })),
  }
}

export async function recordStoreTransaction(
  data: RecordStoreTransaction,
  userId: number,
): Promise<StoreTransactionResponse> {
  const kindConfig = STORE_TRANSACTION_TYPE_BY_KIND[data.kind]
  const transactionType = await prisma.storeTransactionType.findFirstOrThrow({
    where: kindConfig,
    select: { id: true },
  })
  const now = new Date()
  const storeTransactionNumber = await getNewStoreTransactionNumber()

  return prisma.$transaction(async (tx) => {
    const { storePartId, partNumber } = await resolveStorePart(tx, data.part)

    if (!kindConfig.is_inbound) {
      const [onHandRow] = await tx.$queryRawTyped(
        getStorePartOnHandDb(storePartId, data.warehouse_id),
      )
      const onHand = onHandRow?.on_hand ?? 0
      if (onHand < data.quantity) {
        throw new ConflictError(`Only ${onHand} in stock for this part in the selected warehouse`)
      }
    }

    await tx.storeTransaction.create({
      data: {
        store_part_id: storePartId,
        transaction_type_id: transactionType.id,
        quantity: data.quantity,
        unit_cost: data.unit_cost,
        warehouse_id: data.warehouse_id,
        created_by_id: userId,
        created_at: now,
        notes: data.notes,
        store_transaction_number: storeTransactionNumber,
      },
    })

    return {
      store_transaction_number: storeTransactionNumber,
      store_part_id: storePartId,
      part_number: partNumber,
    }
  })
}

async function resolveStorePart(
  tx: Prisma.TransactionClient,
  part: RecordStoreTransaction['part'],
): Promise<{ storePartId: number; partNumber: string }> {
  if (part.mode === 'existing') {
    const existing = await tx.storePart.findUnique({
      where: { id: part.store_part_id },
      select: { id: true, part_number: true },
    })
    if (!existing) throw new NotFoundError(`Store part ${part.store_part_id} not found`)
    return { storePartId: existing.id, partNumber: existing.part_number }
  }

  try {
    const created = await tx.storePart.create({
      data: { part_number: part.part_number, description: part.description },
      select: { id: true, part_number: true },
    })
    return { storePartId: created.id, partNumber: created.part_number }
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new ConflictError(`Part number ${part.part_number} already exists`)
    }
    throw err
  }
}

async function getNewStoreTransactionNumber(): Promise<string> {
  const sequence = await getNextSequence('store_transaction')
  return `S-${String(sequence).padStart(7, '0')}`
}

export async function getAssetStoreParts(barcode: string): Promise<AssetStorePartRow[]> {
  const rows = await prisma.$queryRawTyped(getAssetStorePartsDb(barcode))
  return rows.map((row) => ({ ...row, estimated_cost: row.estimated_cost.toNumber() }))
}

// Consume a store part onto an asset: a USED (outbound) StoreTransaction + an
// AssetStorePart link, with the asset's parts_cost and total_cost bumped atomically.
// The cost is peeled off the front of the part's FIFO queue, never supplied by the
// caller, so it always agrees with the ledger.
export async function addStorePartToAsset(
  barcode: string,
  data: AddStorePartToAsset,
  userId: number,
): Promise<StoreTransactionResponse> {
  const asset = await prisma.asset.findUnique({ where: { barcode }, select: { id: true } })
  if (!asset) throw new NotFoundError(`Asset ${barcode} not found`)

  const usedType = await prisma.storeTransactionType.findFirstOrThrow({
    where: { type: USED_TYPE, is_inbound: false },
    select: { id: true },
  })
  const storeTransactionNumber = await getNewStoreTransactionNumber()
  const now = new Date()

  return prisma.$transaction(async (tx) => {
    const [onHandRow] = await tx.$queryRawTyped(
      getStorePartOnHandDb(data.store_part_id, data.warehouse_id),
    )
    const onHand = onHandRow?.on_hand ?? 0
    if (onHand < data.quantity) {
      throw new ConflictError(`Only ${onHand} in stock for this part in the selected warehouse`)
    }

    const part = await tx.storePart.findUnique({
      where: { id: data.store_part_id },
      select: { part_number: true },
    })
    if (!part) throw new NotFoundError(`Store part ${data.store_part_id} not found`)

    // Read the layers before inserting, so this withdrawal doesn't count itself.
    const layers = await tx.$queryRawTyped(
      getStorePartStockLayersDb(data.store_part_id, data.warehouse_id),
    )
    const purchasedQuantity = layers.reduce((total, layer) => total + layer.quantity, 0)
    const addedCost = consumptionCost(layers, purchasedQuantity - onHand, data.quantity)

    const storeTransaction = await tx.storeTransaction.create({
      data: {
        store_part_id: data.store_part_id,
        transaction_type_id: usedType.id,
        quantity: data.quantity,
        unit_cost: addedCost.div(data.quantity).toDecimalPlaces(UNIT_COST_DECIMAL_PLACES),
        warehouse_id: data.warehouse_id,
        created_by_id: userId,
        created_at: now,
        notes: null,
        store_transaction_number: storeTransactionNumber,
      },
      select: { id: true },
    })

    await tx.assetStorePart.create({
      data: {
        asset_id: asset.id,
        store_part_id: data.store_part_id,
        store_transaction_id: storeTransaction.id,
        estimated_cost: addedCost,
        created_by_id: userId,
        created_at: now,
      },
    })

    const currentCost = await tx.cost.findUnique({
      where: { asset_id: asset.id },
      select: {
        purchase_cost: true,
        transport_cost: true,
        processing_cost: true,
        other_cost: true,
        parts_cost: true,
      },
    })
    const parts_cost = (currentCost?.parts_cost ?? ZERO_COST).add(addedCost)
    const total_cost = (currentCost?.purchase_cost ?? ZERO_COST)
      .add(currentCost?.transport_cost ?? ZERO_COST)
      .add(currentCost?.processing_cost ?? ZERO_COST)
      .add(currentCost?.other_cost ?? ZERO_COST)
      .add(parts_cost)

    await tx.cost.upsert({
      where: { asset_id: asset.id },
      update: { parts_cost, total_cost },
      create: { asset_id: asset.id, parts_cost, total_cost },
    })

    return {
      store_transaction_number: storeTransactionNumber,
      store_part_id: data.store_part_id,
      part_number: part.part_number,
    }
  })
}
