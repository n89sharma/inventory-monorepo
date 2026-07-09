import { z } from 'zod'

const ASSET_COLLECTION_VALUES = [
  'arrival',
  'hold',
  'transfer',
  'purchase-invoice',
  'sales-invoice',
  'departure',
] as const

export const AssetCollectionSchema = z.enum(ASSET_COLLECTION_VALUES)
export type AssetCollection = z.infer<typeof AssetCollectionSchema>
export const ASSET_COLLECTION = AssetCollectionSchema.enum

export const COLLECTION_ADD_MATRIX = {
  arrival: {
    arrival: false,
    hold: true,
    transfer: true,
    'purchase-invoice': true,
    'sales-invoice': true,
    departure: true,
  },
  hold: {
    arrival: false,
    hold: false,
    transfer: true,
    'purchase-invoice': true,
    'sales-invoice': true,
    departure: true,
  },
  transfer: {
    arrival: false,
    hold: false,
    transfer: false,
    'purchase-invoice': true,
    'sales-invoice': true,
    departure: false,
  },
  'purchase-invoice': {
    arrival: false,
    hold: true,
    transfer: true,
    'purchase-invoice': false,
    'sales-invoice': true,
    departure: true,
  },
  'sales-invoice': {
    arrival: false,
    hold: true,
    transfer: true,
    'purchase-invoice': true,
    'sales-invoice': false,
    departure: true,
  },
  departure: {
    arrival: false,
    hold: false,
    transfer: false,
    'purchase-invoice': true,
    'sales-invoice': true,
    departure: false,
  },
} as const satisfies Record<AssetCollection, Record<AssetCollection, boolean>>

export function canAddAssetToCollection(
  active: AssetCollection[],
  target: AssetCollection,
): boolean {
  return active.every((has) => COLLECTION_ADD_MATRIX[has][target])
}

export function activeCollectionsOf(presence: {
  arrival: boolean
  hold: boolean
  transfer: boolean
  purchaseInvoice: boolean
  salesInvoice: boolean
  departure: boolean
}): AssetCollection[] {
  const active: AssetCollection[] = []
  if (presence.arrival) active.push(ASSET_COLLECTION.arrival)
  if (presence.hold) active.push(ASSET_COLLECTION.hold)
  if (presence.transfer) active.push(ASSET_COLLECTION.transfer)
  if (presence.purchaseInvoice) active.push(ASSET_COLLECTION['purchase-invoice'])
  if (presence.salesInvoice) active.push(ASSET_COLLECTION['sales-invoice'])
  if (presence.departure) active.push(ASSET_COLLECTION.departure)
  return active
}

const MAX_ACTIVE_COLLECTIONS_ASSET_IDS = 1000

export const AssetActiveCollectionsRequestSchema = z.object({
  assetIds: z.array(z.number().int().positive()).min(1).max(MAX_ACTIVE_COLLECTIONS_ASSET_IDS),
})
export type AssetActiveCollectionsRequest = z.infer<typeof AssetActiveCollectionsRequestSchema>

export const AssetActiveCollectionsSchema = z.object({
  asset_id: z.number().int(),
  barcode: z.string(),
  active_collections: z.array(AssetCollectionSchema),
})
export type AssetActiveCollections = z.infer<typeof AssetActiveCollectionsSchema>
