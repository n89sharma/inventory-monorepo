import { BID_COLUMN_ROLE, type BidRow } from 'shared-types'
import { describe, expect, it } from 'vitest'
import { labelBidColumns, parseBidMeterReading } from './bid-column-labels'

function rowWithCells(cells: string[]): BidRow {
  return { cells } as BidRow
}

describe('parseBidMeterReading', () => {
  it('reads a meter written with thousands separators', () => {
    expect(parseBidMeterReading('191,346')).toBe(191346)
    expect(parseBidMeterReading(' 1 513 995 ')).toBe(1513995)
  })

  it('reads nothing from blank or non-numeric text', () => {
    expect(parseBidMeterReading('')).toBeNull()
    expect(parseBidMeterReading('n/a')).toBeNull()
  })
})

describe('labelBidColumns', () => {
  it('names a mapped column by its standard name', () => {
    const [column] = labelBidColumns({
      headers: ['Mileage:'],
      rows: [rowWithCells(['120000'])],
      column_mappings: [{ column_index: 0, role: BID_COLUMN_ROLE.TOTAL_METER }],
    })
    expect(column?.label).toBe('Total Meter')
  })

  it('keeps the vendor header of an unmapped column', () => {
    const [column] = labelBidColumns({
      headers: ['Location'],
      rows: [rowWithCells(['Dock 4'])],
      column_mappings: [],
    })
    expect(column?.label).toBe('Location')
  })

  it('names a blank header Unknown with the first non-empty value', () => {
    const [column] = labelBidColumns({
      headers: [''],
      rows: [rowWithCells(['']), rowWithCells(['IRADX4745'])],
      column_mappings: [],
    })
    expect(column?.label).toBe('Unknown (IRADX4745)')
  })

  it('cuts a long sample to 20 characters', () => {
    const [column] = labelBidColumns({
      headers: [''],
      rows: [rowWithCells(['Staple finisher with booklet unit'])],
      column_mappings: [],
    })
    expect(column?.label).toBe('Unknown (Staple finisher with…)')
  })

  it('names a blank, empty column plain Unknown', () => {
    const [column] = labelBidColumns({
      headers: [''],
      rows: [rowWithCells([''])],
      column_mappings: [],
    })
    expect(column?.label).toBe('Unknown')
  })
})
