import { makeAssetSearchRow } from '@/test/asset-factories'
import { makeOrgDetail } from '@/test/org-factories'
import {
  INVOICE_TYPE,
  type AssetSearchRow,
  type InvoiceArrival,
  type InvoiceDeparture,
  type InvoiceDetail,
  type OrgDetail,
} from 'shared-types'
import { describe, expect, it } from 'vitest'
import { invoiceCounterpartyWarning } from './invoice-counterparty-mismatch'

const EWR_NJ = makeOrgDetail(1, 'EWR-NJ')
const ACM = makeOrgDetail(2, 'ACM')
const BOB_HORN = makeOrgDetail(3, 'BOB HORN')

const arrivalFrom = (arrival_number: string, vendor: OrgDetail): InvoiceArrival => ({
  arrival_number,
  transporter: 'FAST FREIGHT',
  destination_code: 'EWR',
  vendor_id: vendor.id,
  vendor: vendor.name,
})

const departureTo = (departure_number: string, customer: OrgDetail): InvoiceDeparture => ({
  departure_number,
  customer_id: customer.id,
  customer: customer.name,
})

function invoiceWith(
  type: string,
  assets: AssetSearchRow[],
  arrivals: InvoiceArrival[],
  departures: InvoiceDeparture[],
): InvoiceDetail {
  return {
    invoice_number: 'I-0019566',
    invoice_reference: 'T:7062-24',
    invoice_type: { id: 1, type },
    is_cleared: false,
    notes: null,
    invoice_date: '2026-01-15',
    created_at: new Date('2026-01-15T00:00:00Z'),
    created_by: {
      id: 1,
      name: 'Alice',
      email: null,
      is_active: true,
      role: null,
      clerk_id: null,
      default_warehouse_id: null,
    },
    customer: EWR_NJ,
    assets,
    arrivals,
    departures,
  }
}

const asset = (barcode: string, arrival_number: string | null, departure_number: string | null) =>
  makeAssetSearchRow({ barcode, arrival_number, departure_number })

describe('invoiceCounterpartyWarning', () => {
  it("flags purchase-invoice assets that arrived from a vendor other than the invoice's", () => {
    const invoice = invoiceWith(
      INVOICE_TYPE.purchase,
      [asset('BC-1', 'A-1', 'D-1'), asset('BC-2', 'A-2', null), asset('BC-3', null, null)],
      [arrivalFrom('A-1', ACM), arrivalFrom('A-2', EWR_NJ)],
      [departureTo('D-1', BOB_HORN)],
    )

    const warning = invoiceCounterpartyWarning(invoice)

    expect(warning?.title).toBe('Vendor mismatch')
    expect(warning?.summary).toBe('1 of 3 assets arrived from vendors other than EWR-NJ: ACM (1).')
    expect([...(warning?.assetWarnings ?? [])]).toEqual([
      ['BC-1', "Arrival A-1 is from ACM; this invoice's vendor is EWR-NJ."],
    ])
  })

  it("flags sales-invoice assets that departed to a customer other than the invoice's", () => {
    const invoice = invoiceWith(
      INVOICE_TYPE.sales,
      [asset('BC-1', 'A-1', 'D-1'), asset('BC-2', 'A-1', 'D-2')],
      [arrivalFrom('A-1', ACM)],
      [departureTo('D-1', BOB_HORN), departureTo('D-2', EWR_NJ)],
    )

    const warning = invoiceCounterpartyWarning(invoice)

    expect(warning?.title).toBe('Customer mismatch')
    expect(warning?.summary).toBe(
      '1 of 2 assets departed to customers other than EWR-NJ: BOB HORN (1).',
    )
    expect([...(warning?.assetWarnings ?? [])]).toEqual([
      ['BC-1', "Departure D-1 went to BOB HORN; this invoice's customer is EWR-NJ."],
    ])
  })

  it('returns nothing when every counterparty matches the invoice', () => {
    const invoice = invoiceWith(
      INVOICE_TYPE.purchase,
      [asset('BC-1', 'A-1', null)],
      [arrivalFrom('A-1', EWR_NJ)],
      [],
    )
    expect(invoiceCounterpartyWarning(invoice)).toBeNull()
  })
})
