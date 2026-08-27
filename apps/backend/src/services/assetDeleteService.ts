import { ConflictError, NotFoundError } from '../lib/errors.js'
import { logger } from '../lib/logger.js'
import { pluralize } from '../lib/pluralize.js'
import { prisma } from '../prisma.js'

const DELETE_BLOCKER_SELECT = {
  id: true,
  serial_number: true,
  departure: { select: { departure_number: true } },
  sales_invoice: { select: { invoice_reference: true } },
  asset_transfers: { select: { transfer: { select: { transfer_number: true } } } },
  _count: {
    select: { asset_store_parts: true, donated_parts: true, received_parts: true },
  },
} as const

type DeletableAsset = {
  departure: { departure_number: string } | null
  sales_invoice: { invoice_reference: string } | null
  asset_transfers: Array<{ transfer: { transfer_number: string } }>
  _count: { asset_store_parts: number; donated_parts: number; received_parts: number }
}

function collectDeleteBlockers(asset: DeletableAsset): string[] {
  const blockers: string[] = []

  if (asset.asset_transfers.length > 0) {
    const numbers = asset.asset_transfers.map((row) => row.transfer.transfer_number).join(', ')
    blockers.push(`transfer ${numbers}`)
  }
  if (asset.departure) {
    blockers.push(`departure ${asset.departure.departure_number}`)
  }
  if (asset.sales_invoice) {
    blockers.push(`sales invoice ${asset.sales_invoice.invoice_reference}`)
  }
  if (asset._count.asset_store_parts > 0) {
    blockers.push(pluralize(asset._count.asset_store_parts, 'consumed store part'))
  }

  const salvagedPartCount = asset._count.donated_parts + asset._count.received_parts
  if (salvagedPartCount > 0) {
    blockers.push(pluralize(salvagedPartCount, 'salvaged part'))
  }

  return blockers
}

export async function deleteAsset(barcode: string, userId: number): Promise<void> {
  const serialNumber = await prisma.$transaction(async (tx) => {
    const asset = await tx.asset.findUnique({
      where: { barcode },
      select: DELETE_BLOCKER_SELECT,
    })
    if (!asset) throw new NotFoundError(`Asset ${barcode} not found`)

    const blockers = collectDeleteBlockers(asset)
    if (blockers.length > 0) {
      throw new ConflictError(
        `Asset ${barcode} cannot be deleted because it is linked to ${blockers.join(', ')}`,
      )
    }

    const assetWhere = { where: { asset_id: asset.id } }
    await tx.assetAccessory.deleteMany(assetWhere)
    await tx.assetError.deleteMany(assetWhere)
    await tx.comment.deleteMany(assetWhere)
    await tx.file.deleteMany(assetWhere)
    await tx.technicalSpecification.deleteMany(assetWhere)
    await tx.cost.deleteMany(assetWhere)
    await tx.asset.delete({ where: { id: asset.id } })

    return asset.serial_number
  })

  logger.warn('Asset deleted', { barcode, serialNumber, userId })
}
