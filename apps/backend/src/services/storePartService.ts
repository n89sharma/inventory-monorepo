import {
  AddPurchase,
  AddPurchaseResponse,
  AddStorePartToAsset,
  AssetStorePartRow,
  StorePartDetail
} from 'shared-types'
import { Prisma } from '../../generated/prisma/client.js'
import {
  getAssetStoreParts as getAssetStorePartsDb,
  getStorePartLedger,
  getStoreParts as getStorePartsDb,
  getStorePartOnHand as getStorePartOnHandDb
} from '../../generated/prisma/sql.js'
import { getNextSequence } from '../lib/db-utils.js'
import { decimalToNumber } from '../lib/decimal.js'
import { ConflictError, NotFoundError } from '../lib/errors.js'
import { prisma } from '../prisma.js'

const PURCHASE_TYPE = 'PURCHASE'
const USED_TYPE = 'USED'

export async function getStoreParts() {
  const rows = await prisma.$queryRawTyped(getStorePartsDb())
  return rows.map(row => ({
    ...row,
    last_purchase_unit_cost: decimalToNumber(row.last_purchase_unit_cost)
  }))
}

export async function getStorePart(partNumber: string): Promise<StorePartDetail> {
  const part = await prisma.storePart.findUnique({
    where: { part_number: partNumber },
    select: { id: true, part_number: true, description: true }
  })
  if (!part) throw new NotFoundError(`Part ${partNumber} not found`)

  const rows = await prisma.$queryRawTyped(getStorePartLedger(partNumber))
  return {
    id: part.id,
    part_number: part.part_number,
    description: part.description,
    transactions: rows.map(row => ({
      ...row,
      unit_cost: decimalToNumber(row.unit_cost)
    }))
  }
}

export async function addPurchase(
  data: AddPurchase,
  userId: number
): Promise<AddPurchaseResponse> {
  const purchaseType = await prisma.storeTransactionType.findFirstOrThrow({
    where: { type: PURCHASE_TYPE, is_inbound: true },
    select: { id: true }
  })
  const now = new Date()
  const storeTransactionNumber = await getNewStoreTransactionNumber()

  return prisma.$transaction(async (tx) => {
    const { storePartId, partNumber } = await resolveStorePart(tx, data.part)

    await tx.storeTransaction.create({
      data: {
        store_part_id: storePartId,
        transaction_type_id: purchaseType.id,
        quantity: data.quantity,
        unit_cost: data.unit_cost,
        warehouse_id: data.warehouse_id,
        created_by_id: userId,
        created_at: now,
        notes: data.notes,
        store_transaction_number: storeTransactionNumber
      }
    })

    return { store_transaction_number: storeTransactionNumber, part_number: partNumber }
  })
}

async function resolveStorePart(
  tx: Prisma.TransactionClient,
  part: AddPurchase['part']
): Promise<{ storePartId: number; partNumber: string }> {
  if (part.mode === 'existing') {
    const existing = await tx.storePart.findUnique({
      where: { id: part.store_part_id },
      select: { id: true, part_number: true }
    })
    if (!existing) throw new NotFoundError(`Store part ${part.store_part_id} not found`)
    return { storePartId: existing.id, partNumber: existing.part_number }
  }

  try {
    const created = await tx.storePart.create({
      data: { part_number: part.part_number, description: part.description },
      select: { id: true, part_number: true }
    })
    return { storePartId: created.id, partNumber: created.part_number }
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    ) {
      throw new ConflictError(`Part number ${part.part_number} already exists`)
    }
    throw err
  }
}

export async function getNewStoreTransactionNumber(): Promise<string> {
  const sequence = await getNextSequence('store_transaction')
  return `S-${String(sequence).padStart(7, '0')}`
}

export async function getAssetStoreParts(barcode: string): Promise<AssetStorePartRow[]> {
  const rows = await prisma.$queryRawTyped(getAssetStorePartsDb(barcode))
  return rows.map(row => ({ ...row, estimated_cost: row.estimated_cost.toNumber() }))
}

// Consume a store part onto an asset: a USED (outbound) StoreTransaction + an
// AssetStorePart link, with the asset's parts_cost and total_cost bumped atomically.
export async function addStorePartToAsset(
  barcode: string,
  data: AddStorePartToAsset,
  userId: number
): Promise<AddPurchaseResponse> {
  const asset = await prisma.asset.findUnique({ where: { barcode }, select: { id: true } })
  if (!asset) throw new NotFoundError(`Asset ${barcode} not found`)

  const usedType = await prisma.storeTransactionType.findFirstOrThrow({
    where: { type: USED_TYPE, is_inbound: false },
    select: { id: true }
  })
  const storeTransactionNumber = await getNewStoreTransactionNumber()
  const now = new Date()
  const addedCost = data.quantity * data.unit_cost

  return prisma.$transaction(async (tx) => {
    const [onHandRow] = await tx.$queryRawTyped(
      getStorePartOnHandDb(data.store_part_id, data.warehouse_id)
    )
    const onHand = onHandRow?.on_hand ?? 0
    if (onHand < data.quantity) {
      throw new ConflictError(
        `Only ${onHand} in stock for this part in the selected warehouse`
      )
    }

    const part = await tx.storePart.findUnique({
      where: { id: data.store_part_id },
      select: { part_number: true }
    })
    if (!part) throw new NotFoundError(`Store part ${data.store_part_id} not found`)

    const storeTransaction = await tx.storeTransaction.create({
      data: {
        store_part_id: data.store_part_id,
        transaction_type_id: usedType.id,
        quantity: data.quantity,
        unit_cost: data.unit_cost,
        warehouse_id: data.warehouse_id,
        created_by_id: userId,
        created_at: now,
        notes: null,
        store_transaction_number: storeTransactionNumber
      },
      select: { id: true }
    })

    await tx.assetStorePart.create({
      data: {
        asset_id: asset.id,
        store_part_id: data.store_part_id,
        store_transaction_id: storeTransaction.id,
        estimated_cost: addedCost,
        created_by_id: userId,
        created_at: now
      }
    })

    const currentCost = await tx.cost.findUnique({
      where: { asset_id: asset.id },
      select: {
        purchase_cost: true, transport_cost: true,
        processing_cost: true, other_cost: true, parts_cost: true
      }
    })
    const parts_cost = (currentCost?.parts_cost?.toNumber() ?? 0) + addedCost
    const total_cost = (currentCost?.purchase_cost?.toNumber() ?? 0)
      + (currentCost?.transport_cost?.toNumber() ?? 0)
      + (currentCost?.processing_cost?.toNumber() ?? 0)
      + (currentCost?.other_cost?.toNumber() ?? 0)
      + parts_cost

    await tx.cost.upsert({
      where: { asset_id: asset.id },
      update: { parts_cost, total_cost },
      create: { asset_id: asset.id, parts_cost, total_cost }
    })

    return { store_transaction_number: storeTransactionNumber, part_number: part.part_number }
  })
}
