import { describe, expect, it } from 'vitest'
import { classifyBidColumns } from './bid-column-recognition'

describe('classifyBidColumns', () => {
  it('recognises each term regardless of case and renames it', () => {
    const columns = classifyBidColumns([
      'SERIAL NO',
      'Make',
      'model',
      'Total Meter',
      'Accessories',
      'Notes',
    ])
    expect(columns.map((column) => [column.label, column.recognized])).toEqual([
      ['Brand', true],
      ['Model', true],
      ['Serial #', true],
      ['Total Meter', true],
      ['Accessories', true],
      ['Notes', true],
    ])
  })

  it('leaves both headers unrecognised when two match one term', () => {
    const columns = classifyBidColumns(['Serial', 'Meter Black', 'Meter Colour'])
    expect(columns).toEqual([
      { index: 0, label: 'Serial #', recognized: true },
      { index: 1, label: 'Meter Black', recognized: false },
      { index: 2, label: 'Meter Colour', recognized: false },
    ])
  })

  it('leaves a header matching two terms unrecognised', () => {
    expect(classifyBidColumns(['Make/Model'])).toEqual([
      { index: 0, label: 'Make/Model', recognized: false },
    ])
  })

  it('recognises nothing when there are no headers', () => {
    expect(classifyBidColumns(['', '']).every((column) => !column.recognized)).toBe(true)
  })

  it('puts recognised columns first in the fixed order and unknown ones in pasted order', () => {
    const columns = classifyBidColumns(['Location', 'Serial', 'Price', 'Model'])
    expect(columns.map((column) => column.index)).toEqual([3, 1, 0, 2])
  })
})
