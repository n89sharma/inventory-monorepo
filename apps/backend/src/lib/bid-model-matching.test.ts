import { describe, expect, it } from 'vitest'
import { bidModelLookupKey } from './bid-model-matching.js'

const BRAND_NAMES = ['CANON', 'RICOH', 'KONICA-MINOLTA']

describe('bidModelLookupKey', () => {
  it('rewrites every spelling of the imageRUNNER ADVANCE series to the catalogue form', () => {
    const keys = [
      'iR ADV DX 4745i',
      'IR Adv DX 4745i',
      'iR ADVANCE DX 4745i',
      'imageRUNNER ADVANCE DX 4745i',
    ].map((text) => bidModelLookupKey(text, BRAND_NAMES))
    expect(new Set(keys)).toEqual(new Set(['iradx4745i']))
  })

  it('rewrites imageRUNNER without ADVANCE to IR', () => {
    expect(bidModelLookupKey('imageRUNNER 4225', BRAND_NAMES)).toBe('ir4225')
  })

  it('drops a leading brand name', () => {
    expect(bidModelLookupKey('Ricoh MP 4055', BRAND_NAMES)).toBe('mp4055')
    expect(bidModelLookupKey('Konica-Minolta C458', BRAND_NAMES)).toBe('c458')
  })

  it('keeps a plus sign, which tells models apart', () => {
    expect(bidModelLookupKey('VP 135+', BRAND_NAMES)).toBe('vp135+')
  })

  it('gives no key for text naming several models', () => {
    expect(bidModelLookupKey('iR Adv DX 8705/8795', BRAND_NAMES)).toBeNull()
  })

  it('gives no key for blank text', () => {
    expect(bidModelLookupKey('  ', BRAND_NAMES)).toBeNull()
  })
})
