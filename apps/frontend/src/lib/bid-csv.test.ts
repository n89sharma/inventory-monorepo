import { toCsv } from '@/lib/csv'
import type { BidDetail, BidRow } from 'shared-types'
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

function makeBid(headers: string[], rows: BidRow[]): BidDetail {
  return { bid_number: 'B-0000001', headers, rows } as BidDetail
}

describe('bidCsvColumns', () => {
  it('writes the pasted columns in pasted order, then the pricing columns', () => {
    const bid = makeBid(['Serial', 'Model'], [PRICED_ROW, NO_BID_ROW])
    expect(toCsv(bidCsvColumns(bid), bid.rows).split('\r\n')).toEqual([
      'Serial,Model,Selling Price,Freight,Margin %,Margin,Bid Price,No Bid',
      'QHP03382,iR ADV 4245,1000.00,30.00,25.00,250.00,720.00,',
      'JMQ13257,"iR ADV C5250, scratched",,,,,,Yes',
    ])
  })

  it('names blank pasted headers by their position', () => {
    const bid = makeBid(['', 'Model'], [PRICED_ROW])
    expect(bidCsvColumns(bid)[0]?.header).toBe('Column 1')
  })
})

describe('bidCsvFilename', () => {
  it('names the file after the bid number', () => {
    expect(bidCsvFilename(makeBid([], []))).toBe('B-0000001.csv')
  })
})
