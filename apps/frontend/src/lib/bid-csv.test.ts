import { toCsv } from '@/lib/csv'
import { BID_COLUMN_ROLE, type BidColumnMapping, type BidDetail, type BidRow } from 'shared-types'
import { describe, expect, it } from 'vitest'
import { bidCsvColumns, bidCsvFilename } from './bid-csv'

const PRICED_ROW: BidRow = {
  id: 1,
  cells: ['QHP03382', 'iR ADV 4245'],
  selling_price: 1000,
  transport_cost: 30,
  transport_cost_overridden: false,
  margin_percent: 25,
  margin_overridden: false,
  zero_priced: false,
  priced: true,
  bid_price: 720,
  total_cost: 750,
  margin_amount: 250,
}

const NO_BID_ROW: BidRow = {
  ...PRICED_ROW,
  id: 2,
  cells: ['JMQ13257', 'iR ADV C5250, scratched'],
  selling_price: null,
  transport_cost: null,
  margin_percent: null,
  zero_priced: true,
  bid_price: null,
  total_cost: null,
  margin_amount: null,
}

function makeBid(
  headers: string[],
  rows: BidRow[],
  columnMappings: BidColumnMapping[] = [],
): BidDetail {
  return { bid_number: 'B-0000001', headers, rows, column_mappings: columnMappings } as BidDetail
}

describe('bidCsvColumns', () => {
  it('writes mapped columns first under their standard names, then the rest, then pricing', () => {
    const bid = makeBid(
      ['Serial No', 'Description'],
      [PRICED_ROW, NO_BID_ROW],
      [{ column_index: 1, role: BID_COLUMN_ROLE.MODEL }],
    )
    expect(toCsv(bidCsvColumns(bid), bid.rows).split('\r\n')).toEqual([
      'Model,Serial #,Selling Price,Freight,Margin %,Margin,Bid Price,No Bid',
      'iR ADV 4245,QHP03382,1000.00,30.00,25.00,250.00,720.00,',
      '"iR ADV C5250, scratched",JMQ13257,,,,,,Yes',
    ])
  })

  it('writes the Total Meter as a plain number', () => {
    const bid = makeBid(['Total Meter'], [{ ...PRICED_ROW, cells: ['191,346'] }])
    expect(toCsv(bidCsvColumns(bid), bid.rows).split('\r\n')[1]?.split(',')[0]).toBe('191346')
  })

  it('keeps an unreadable Total Meter as pasted', () => {
    const bid = makeBid(['Total Meter'], [{ ...PRICED_ROW, cells: ['n/a'] }])
    expect(toCsv(bidCsvColumns(bid), bid.rows).split('\r\n')[1]?.split(',')[0]).toBe('n/a')
  })

  it('names a blank pasted header Unknown with its first value', () => {
    const bid = makeBid(['', 'Location'], [PRICED_ROW])
    expect(bidCsvColumns(bid)[0]?.header).toBe('Unknown (QHP03382)')
  })
})

describe('bidCsvFilename', () => {
  it('names the file after the bid number', () => {
    expect(bidCsvFilename(makeBid([], []))).toBe('B-0000001.csv')
  })
})
