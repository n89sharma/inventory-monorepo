import { makeAssetSearchRow } from '@/test/asset-factories'
import { makeOrgDetail } from '@/test/org-factories'
import type { AssetSearchRow, DepartureDetail, DepartureInvoice } from 'shared-types'
import { describe, expect, it } from 'vitest'
import { departureCustomerWarning } from './departure-customer-mismatch'

const ABM = makeOrgDetail(1, 'ABM')
const IMAGENET = makeOrgDetail(2, 'IMAGENET')

const ABM_INVOICE: DepartureInvoice = {
  invoice_number: 'I-1',
  invoice_reference: 'REF-ABM',
  customer_id: ABM.id,
  customer: ABM.name,
}
const IMAGENET_INVOICE: DepartureInvoice = {
  invoice_number: 'I-2',
  invoice_reference: 'INV-001',
  customer_id: IMAGENET.id,
  customer: IMAGENET.name,
}

function departureWith(assets: AssetSearchRow[], invoices: DepartureInvoice[]): DepartureDetail {
  return {
    departure_number: 'D-YYZ-0000001',
    origin: { id: 1, city_code: 'YYZ', street: '1 Main St', is_active: true },
    customer: ABM,
    transporter: makeOrgDetail(9, 'FAST FREIGHT'),
    notes: null,
    created_at: new Date('2026-01-01T00:00:00Z'),
    created_by: 'Alice',
    salesperson: null,
    assets,
    invoices,
  }
}

const onInvoice = (barcode: string, invoice: DepartureInvoice | null) =>
  makeAssetSearchRow({
    barcode,
    sales_invoice_invoice_number: invoice?.invoice_number ?? null,
    sales_invoice_invoice_reference: invoice?.invoice_reference ?? null,
  })

describe('departureCustomerWarning', () => {
  it("returns nothing when every invoice is billed to the departure's customer", () => {
    const departure = departureWith([onInvoice('BC-1', ABM_INVOICE)], [ABM_INVOICE])
    expect(departureCustomerWarning(departure)).toBeNull()
  })

  it('flags the assets invoiced to another customer', () => {
    const departure = departureWith(
      [
        onInvoice('BC-1', IMAGENET_INVOICE),
        onInvoice('BC-2', ABM_INVOICE),
        onInvoice('BC-3', null),
      ],
      [ABM_INVOICE, IMAGENET_INVOICE],
    )

    const warning = departureCustomerWarning(departure)

    expect(warning?.title).toBe('Customer mismatch')
    expect(warning?.summary).toBe(
      '1 of 3 assets invoiced to customers other than ABM: INV-001 to IMAGENET (1).',
    )
    expect([...(warning?.assetWarnings ?? [])]).toEqual([
      ['BC-1', "Invoice INV-001 is billed to IMAGENET; this departure's customer is ABM."],
    ])
  })
})
