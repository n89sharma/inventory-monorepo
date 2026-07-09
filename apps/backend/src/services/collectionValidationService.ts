import {
  activeCollectionsOf,
  AssetActiveCollections,
  canAddAssetToCollection,
  type AssetCollection,
} from 'shared-types'
import type { Prisma } from '../../generated/prisma/client.js'
import { ConflictError } from '../lib/errors.js'

export async function getAssetActiveCollections(
  client: Prisma.TransactionClient,
  assetIds: number[],
): Promise<AssetActiveCollections[]> {
  if (assetIds.length === 0) return []

  const assets = await client.asset.findMany({
    where: { id: { in: assetIds } },
    select: {
      id: true,
      barcode: true,
      arrival_id: true,
      hold_id: true,
      is_in_transit: true,
      purchase_invoice_id: true,
      sales_invoice_id: true,
      departure_id: true,
    },
  })

  return assets.map((a) => ({
    asset_id: a.id,
    barcode: a.barcode,
    active_collections: activeCollectionsOf({
      arrival: a.arrival_id !== null,
      hold: a.hold_id !== null,
      transfer: a.is_in_transit,
      purchaseInvoice: a.purchase_invoice_id !== null,
      salesInvoice: a.sales_invoice_id !== null,
      departure: a.departure_id !== null,
    }),
  }))
}

export async function assertAssetsCanJoinCollection(
  tx: Prisma.TransactionClient,
  assetIds: number[],
  target: AssetCollection,
): Promise<void> {
  const rows = await getAssetActiveCollections(tx, assetIds)
  const blocked = rows.filter((r) => !canAddAssetToCollection(r.active_collections, target))
  if (blocked.length > 0)
    throw new ConflictError(
      `The following assets cannot be added to ${target}: ${blocked.map((r) => r.barcode).join(', ')}`,
    )
}
