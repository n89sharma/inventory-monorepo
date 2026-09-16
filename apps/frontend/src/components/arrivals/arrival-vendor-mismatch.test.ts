import { makeAssetSearchRow } from '@/test/asset-factories'
import { makeOrgDetail } from '@/test/org-factories'
import type { ArrivalDetail, ArrivalInvoice, AssetSearchRow } from 'shared-types'
import { describe, expect, it } from 'vitest'
import { arrivalVendorWarning } from './arrival-vendor-mismatch'

const ACM = makeOrgDetail(1, 'ACM')
const BOB_HORN = makeOrgDetail(2, 'BOB HORN')

const ACM_INVOICE: ArrivalInvoice = {
  invoice_number: 'I-1',
  invoice_reference: 'REF-ACM',
  vendor_id: ACM.id,
  vendor: ACM.name,
}
const BOB_HORN_INVOICE: ArrivalInvoice = {
  invoice_number: 'I-2',
  invoice_reference: '63977',
  vendor_id: BOB_HORN.id,
  vendor: BOB_HORN.name,
}

function arrivalWith(assets: AssetSearchRow[], invoices: ArrivalInvoice[]): ArrivalDetail {
  return {
    arrival_number: 'A-EWR-0000007',
    vendor: ACM,
    transporter: makeOrgDetail(9, 'FAST FREIGHT'),
    warehouse: null,
    comment: null,
    created_at: new Date('2026-01-01T00:00:00Z'),
    created_by: 'Alice',
    assets,
    invoices,
  }
}

const onInvoice = (barcode: string, invoice: ArrivalInvoice | null, asset_type = 'COPIER') =>
  makeAssetSearchRow({
    barcode,
    asset_type,
    purchase_invoice_invoice_number: invoice?.invoice_number ?? null,
    purchase_invoice_invoice_reference: invoice?.invoice_reference ?? null,
  })

describe('arrivalVendorWarning', () => {
  it("returns nothing when every invoice is from the arrival's vendor", () => {
    const arrival = arrivalWith([onInvoice('BC-1', ACM_INVOICE)], [ACM_INVOICE])
    expect(arrivalVendorWarning(arrival)).toBeNull()
  })

  it('flags every asset invoiced by another vendor, whatever its type', () => {
    const arrival = arrivalWith(
      [
        onInvoice('BC-1', BOB_HORN_INVOICE),
        onInvoice('BC-2', BOB_HORN_INVOICE, 'PART'),
        onInvoice('BC-3', ACM_INVOICE),
        onInvoice('BC-4', null),
      ],
      [ACM_INVOICE, BOB_HORN_INVOICE],
    )

    const warning = arrivalVendorWarning(arrival)

    const message = "Invoice 63977 is from BOB HORN; this arrival's vendor is ACM."
    expect(warning?.title).toBe('Vendor mismatch')
    expect(warning?.summary).toBe(
      '2 of 4 assets invoiced by vendors other than ACM: 63977 from BOB HORN (2).',
    )
    expect([...(warning?.assetWarnings ?? [])]).toEqual([
      ['BC-1', message],
      ['BC-2', message],
    ])
  })
})
