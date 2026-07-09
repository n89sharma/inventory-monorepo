import { activeCollectionsOf, AssetCollection, canAddAssetToCollection } from 'shared-types'
import { describe, expect, it } from 'vitest'

const ALL_COLLECTIONS: AssetCollection[] = [
  'arrival',
  'hold',
  'transfer',
  'purchase-invoice',
  'sales-invoice',
  'departure',
]

describe('canAddAssetToCollection', () => {
  it('allows an asset with no active memberships to join any target', () => {
    expect(canAddAssetToCollection([], 'departure')).toBe(true)
  })

  it('blocks an in-transit asset from departing', () => {
    expect(canAddAssetToCollection(['transfer'], 'departure')).toBe(false)
  })

  it('blocks an in-transit asset from being held', () => {
    expect(canAddAssetToCollection(['transfer'], 'hold')).toBe(false)
  })

  it('freezes a departed asset against physical moves', () => {
    expect(canAddAssetToCollection(['departure'], 'hold')).toBe(false)
    expect(canAddAssetToCollection(['departure'], 'transfer')).toBe(false)
  })

  it('still allows post-departure invoicing', () => {
    expect(canAddAssetToCollection(['departure'], 'purchase-invoice')).toBe(true)
    expect(canAddAssetToCollection(['departure'], 'sales-invoice')).toBe(true)
  })

  it('lets an arrived, held asset depart (conjunction of permissive rows)', () => {
    expect(canAddAssetToCollection(['arrival', 'hold'], 'departure')).toBe(true)
  })

  it('blocks joining a collection the asset is already active in (diagonal)', () => {
    for (const c of ALL_COLLECTIONS) expect(canAddAssetToCollection([c], c)).toBe(false)
  })
})

describe('activeCollectionsOf', () => {
  it('maps each presence flag to the matching collection', () => {
    expect(
      activeCollectionsOf({
        arrival: true,
        hold: false,
        transfer: true,
        purchaseInvoice: false,
        salesInvoice: true,
        departure: false,
      }),
    ).toEqual(['arrival', 'transfer', 'sales-invoice'])
  })

  it('returns an empty list when nothing is active', () => {
    expect(
      activeCollectionsOf({
        arrival: false,
        hold: false,
        transfer: false,
        purchaseInvoice: false,
        salesInvoice: false,
        departure: false,
      }),
    ).toEqual([])
  })
})
