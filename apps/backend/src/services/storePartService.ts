import { AddPurchase, AddPurchaseResponse, StorePartDetail } from 'shared-types'
import { Prisma } from '../../generated/prisma/client.js'
import { getStorePartLedger, getStoreParts as getStorePartsDb } from '../../generated/prisma/sql.js'
import { getNextSequence } from '../lib/db-utils.js'
import { ConflictError, NotFoundError } from '../lib/errors.js'
import { prisma } from '../prisma.js'

const PURCHASE_TYPE = 'PURCHASE'

export async function getStoreParts() {
  return prisma.$queryRawTyped(getStorePartsDb())
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
      unit_cost: row.unit_cost === null ? null : Number(row.unit_cost)
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

async function getNewStoreTransactionNumber(): Promise<string> {
  const sequence = await getNextSequence('store_transaction')
  return `S-${String(sequence).padStart(7, '0')}`
}
