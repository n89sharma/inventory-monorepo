import { BID_COLUMN_ROLE, classifyBidColumns } from 'shared-types'
import { describe, expect, it } from 'vitest'

describe('classifyBidColumns', () => {
  it('recognises each term regardless of case', () => {
    const columns = classifyBidColumns([
      'SERIAL NO',
      'Make',
      'model',
      'Total Meter',
      'Accessories',
      'Notes',
    ])
    expect(columns.map((column) => [column.role, column.source])).toEqual([
      [BID_COLUMN_ROLE.BRAND, 'automatic'],
      [BID_COLUMN_ROLE.MODEL, 'automatic'],
      [BID_COLUMN_ROLE.SERIAL, 'automatic'],
      [BID_COLUMN_ROLE.TOTAL_METER, 'automatic'],
      [BID_COLUMN_ROLE.ACCESSORIES, 'automatic'],
      [BID_COLUMN_ROLE.NOTES, 'automatic'],
    ])
  })

  it('leaves both headers unrecognised when two match one term', () => {
    const columns = classifyBidColumns(['Serial', 'Meter Black', 'Meter Colour'])
    expect(columns).toEqual([
      { index: 0, header: 'Serial', role: BID_COLUMN_ROLE.SERIAL, source: 'automatic' },
      { index: 1, header: 'Meter Black', role: null, source: null },
      { index: 2, header: 'Meter Colour', role: null, source: null },
    ])
  })

  it('leaves a header matching two terms unrecognised', () => {
    expect(classifyBidColumns(['Make/Model'])).toEqual([
      { index: 0, header: 'Make/Model', role: null, source: null },
    ])
  })

  it('recognises nothing when there are no headers', () => {
    expect(classifyBidColumns(['', '']).every((column) => column.role === null)).toBe(true)
  })

  it('puts recognised columns first in the fixed order and unknown ones in pasted order', () => {
    const columns = classifyBidColumns(['Location', 'Serial', 'Price', 'Model'])
    expect(columns.map((column) => column.index)).toEqual([3, 1, 0, 2])
  })

  it('places a manually mapped column among the recognised ones in the fixed order', () => {
    const columns = classifyBidColumns(
      ['Mileage', 'Serial', 'Location', 'Brand'],
      [
        { column_index: 0, role: BID_COLUMN_ROLE.TOTAL_METER },
        { column_index: 3, role: BID_COLUMN_ROLE.BRAND },
      ],
    )
    expect(columns.map((column) => [column.index, column.source])).toEqual([
      [3, 'manual'],
      [1, 'automatic'],
      [0, 'manual'],
      [2, null],
    ])
  })

  it('lets a manual mapping take a type that a header would match automatically', () => {
    const columns = classifyBidColumns(
      ['Model', 'Description'],
      [{ column_index: 1, role: BID_COLUMN_ROLE.MODEL }],
    )
    expect(columns).toEqual([
      { index: 1, header: 'Description', role: BID_COLUMN_ROLE.MODEL, source: 'manual' },
      { index: 0, header: 'Model', role: null, source: null },
    ])
  })

  it('never recognises a manually mapped column automatically', () => {
    const columns = classifyBidColumns(
      ['Serial', 'Serial Alt'],
      [{ column_index: 1, role: BID_COLUMN_ROLE.NOTES }],
    )
    expect(columns.map((column) => [column.index, column.role, column.source])).toEqual([
      [0, BID_COLUMN_ROLE.SERIAL, 'automatic'],
      [1, BID_COLUMN_ROLE.NOTES, 'manual'],
    ])
  })
})
