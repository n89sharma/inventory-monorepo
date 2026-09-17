import { describe, expect, it } from 'vitest'
import { countAssetTypes, filterAssetsByType, resolveAssetTypeFilter } from './asset-type-filter'

const copier = { barcode: 'C1', asset_type: 'COPIER' }
const finisher = { barcode: 'F1', asset_type: 'FINISHER' }
const accessory = { barcode: 'A1', asset_type: 'ACCESSORY' }
const scanner = { barcode: 'S1', asset_type: 'SCANNER' }

describe('countAssetTypes', () => {
  it('counts each type, and a type outside the three only under all', () => {
    expect(countAssetTypes([copier, copier, finisher, accessory, scanner])).toEqual({
      all: 5,
      copier: 2,
      finisher: 1,
      accessory: 1,
    })
  })
})

describe('resolveAssetTypeFilter', () => {
  it('defaults to copiers when the collection received a copier', () => {
    expect(resolveAssetTypeFilter(null, countAssetTypes([copier, accessory]))).toBe('copier')
  })

  it('defaults to all when the collection holds only accessories', () => {
    expect(resolveAssetTypeFilter(null, countAssetTypes([accessory, accessory]))).toBe('all')
  })

  it('honours a type chosen in the link even when the collection has none of it', () => {
    expect(resolveAssetTypeFilter('finisher', countAssetTypes([copier]))).toBe('finisher')
  })
})

describe('filterAssetsByType', () => {
  const assets = [copier, finisher, accessory, scanner]

  it('keeps every asset under all', () => {
    expect(filterAssetsByType(assets, 'all')).toEqual(assets)
  })

  it('keeps only the chosen type', () => {
    expect(filterAssetsByType(assets, 'finisher')).toEqual([finisher])
  })
})
