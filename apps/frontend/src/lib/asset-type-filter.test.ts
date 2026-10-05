import { describe, expect, it } from 'vitest'
import { countAssetTypes, filterAssetsByType, resolveAssetTypeFilter } from './asset-type-filter'

const copier = { barcode: 'C1', asset_type: 'COPIER' }
const finisher = { barcode: 'F1', asset_type: 'FINISHER' }
const accessory = { barcode: 'A1', asset_type: 'ACCESSORY' }
const scanner = { barcode: 'S1', asset_type: 'SCANNER' }
const printer = { barcode: 'P1', asset_type: 'PRINTER' }

describe('countAssetTypes', () => {
  it('counts each named type, and any other type under other and all', () => {
    expect(countAssetTypes([copier, copier, finisher, accessory, scanner, printer])).toEqual({
      all: 6,
      copier: 2,
      finisher: 1,
      accessory: 1,
      other: 2,
    })
  })

  it('counts no other when every asset is a copier, finisher or accessory', () => {
    expect(countAssetTypes([copier, finisher, accessory]).other).toBe(0)
  })
})

describe('resolveAssetTypeFilter', () => {
  it('defaults to copiers when the collection received a copier', () => {
    expect(resolveAssetTypeFilter(null, countAssetTypes([copier, accessory]))).toBe('copier')
  })

  it('defaults to all when the collection holds only accessories', () => {
    expect(resolveAssetTypeFilter(null, countAssetTypes([accessory, accessory]))).toBe('all')
  })

  it('defaults to all when the collection holds only other types', () => {
    expect(resolveAssetTypeFilter(null, countAssetTypes([scanner, printer]))).toBe('all')
  })

  it('honours a type chosen in the link even when the collection has none of it', () => {
    expect(resolveAssetTypeFilter('finisher', countAssetTypes([copier]))).toBe('finisher')
  })

  it('honours other chosen in the link even when the collection has none of it', () => {
    expect(resolveAssetTypeFilter('other', countAssetTypes([copier]))).toBe('other')
  })
})

describe('filterAssetsByType', () => {
  const assets = [copier, finisher, accessory, scanner, printer]

  it('keeps every asset under all', () => {
    expect(filterAssetsByType(assets, 'all')).toEqual(assets)
  })

  it('keeps only the chosen type', () => {
    expect(filterAssetsByType(assets, 'finisher')).toEqual([finisher])
  })

  it('keeps every type outside the three named ones under other', () => {
    expect(filterAssetsByType(assets, 'other')).toEqual([scanner, printer])
  })
})
