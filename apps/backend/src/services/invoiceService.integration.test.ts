import { ASSET_STATUS } from 'shared-types'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import {
  ArrivalTestData,
  buildCreateInvoiceInput,
  cleanupTransactionalData,
  createArrivedAssets,
  getAssetStatus,
  seedArrivalTestData,
} from '../../test/factories.js'
import { ConflictError } from '../lib/errors.js'
import { prisma } from '../prisma.js'
import { createInvoice, getInvoice, patchInvoiceMetadata } from './invoiceService.js'

describe('invoiceService', () => {
  let refs: ArrivalTestData

  beforeAll(async () => {
    refs = await seedArrivalTestData()
  })

  afterEach(async () => {
    await cleanupTransactionalData()
  })

  afterAll(async () => {
    await cleanupTransactionalData()
  })

  it('links assets to a sales invoice via sales_invoice_id without changing status', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    await createInvoice(buildCreateInvoiceInput(refs, [asset], refs.invoiceTypeSaleId), refs.userId)

    const row = await prisma.asset.findUniqueOrThrow({
      where: { id: asset.id },
      select: { sales_invoice_id: true, purchase_invoice_id: true },
    })
    expect(row.sales_invoice_id).not.toBeNull()
    expect(row.purchase_invoice_id).toBeNull()
    expect(await getAssetStatus(asset.id)).toBe(ASSET_STATUS.IN_STOCK)
  })

  it('links assets to a purchase invoice via purchase_invoice_id', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    await createInvoice(
      buildCreateInvoiceInput(refs, [asset], refs.invoiceTypePurchaseId),
      refs.userId,
    )

    const row = await prisma.asset.findUniqueOrThrow({
      where: { id: asset.id },
      select: { sales_invoice_id: true, purchase_invoice_id: true },
    })
    expect(row.purchase_invoice_id).not.toBeNull()
    expect(row.sales_invoice_id).toBeNull()
  })

  it('rejects assigning an asset already on another invoice of the same type', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    await createInvoice(buildCreateInvoiceInput(refs, [asset], refs.invoiceTypeSaleId), refs.userId)

    await expect(
      createInvoice(buildCreateInvoiceInput(refs, [asset], refs.invoiceTypeSaleId), refs.userId),
    ).rejects.toThrow(ConflictError)
  })

  it('allows the same asset on both a sales and a purchase invoice', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    await createInvoice(buildCreateInvoiceInput(refs, [asset], refs.invoiceTypeSaleId), refs.userId)

    await expect(
      createInvoice(
        buildCreateInvoiceInput(refs, [asset], refs.invoiceTypePurchaseId),
        refs.userId,
      ),
    ).resolves.toBeDefined()
  })

  it('persists notes on create and updates them via metadata patch', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    const { invoiceNumber } = await createInvoice(
      {
        ...buildCreateInvoiceInput(refs, [asset], refs.invoiceTypeSaleId),
        comment: 'initial note',
      },
      refs.userId,
    )

    const created = await getInvoice(invoiceNumber, 'admin')
    expect(created.notes).toBe('initial note')

    await patchInvoiceMetadata(
      invoiceNumber,
      { organization: refs.customer, is_cleared: created.is_cleared, comment: 'updated note' },
      refs.userId,
    )
    expect((await getInvoice(invoiceNumber, 'admin')).notes).toBe('updated note')

    await patchInvoiceMetadata(
      invoiceNumber,
      { organization: refs.customer, is_cleared: created.is_cleared, comment: null },
      refs.userId,
    )
    expect((await getInvoice(invoiceNumber, 'admin')).notes).toBeNull()
  })

  it('returns asset cost, redacted by role permissions', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    const { invoiceNumber } = await createInvoice(
      buildCreateInvoiceInput(refs, [asset], refs.invoiceTypeSaleId),
      refs.userId,
    )
    await prisma.cost.upsert({
      where: { asset_id: asset.id },
      create: {
        asset_id: asset.id,
        purchase_cost: 100,
        transport_cost: 20,
        processing_cost: 30,
        other_cost: 5,
        parts_cost: 15,
        total_cost: 170,
        sale_price: 500,
      },
      update: {
        purchase_cost: 100,
        transport_cost: 20,
        processing_cost: 30,
        other_cost: 5,
        parts_cost: 15,
        total_cost: 170,
        sale_price: 500,
      },
    })

    const asAdmin = await getInvoice(invoiceNumber, 'admin')
    expect(asAdmin.assets[0].cost).toEqual({
      purchase_cost: 100,
      transport_cost: 20,
      processing_cost: 30,
      other_cost: 5,
      parts_cost: 15,
      total_cost: 170,
      sale_price: 500,
    })

    // 'sales' has view_sale_price but not view_purchase_price
    const asSales = await getInvoice(invoiceNumber, 'sales')
    expect(asSales.assets[0].cost).toEqual({
      purchase_cost: null,
      transport_cost: null,
      processing_cost: null,
      other_cost: null,
      parts_cost: null,
      total_cost: null,
      sale_price: 500,
    })

    // 'member' has neither price permission
    const asMember = await getInvoice(invoiceNumber, 'member')
    expect(asMember.assets[0].cost).toEqual({
      purchase_cost: null,
      transport_cost: null,
      processing_cost: null,
      other_cost: null,
      parts_cost: null,
      total_cost: null,
      sale_price: null,
    })
  })

  it('returns the distinct arrivals of the invoiced assets', async () => {
    const firstBatch = await createArrivedAssets(refs, 2)
    const secondBatch = await createArrivedAssets(refs, 1)
    const { invoiceNumber } = await createInvoice(
      buildCreateInvoiceInput(refs, [...firstBatch, ...secondBatch], refs.invoiceTypeSaleId),
      refs.userId,
    )

    const invoice = await getInvoice(invoiceNumber, 'admin')

    // two arrival batches -> two distinct arrivals, deduped despite 3 assets
    expect(invoice.arrivals).toHaveLength(2)
    for (const arrival of invoice.arrivals) {
      expect(arrival.transporter).toBe(refs.transporter.name)
      expect(arrival.destination_code).toBe(refs.warehouse.city_code)
      expect(arrival.arrival_number).toMatch(/^A-/)
    }
    const arrivalNumbers = invoice.arrivals.map((a) => a.arrival_number)
    expect(new Set(arrivalNumbers).size).toBe(2)
  })

  it('numbers the invoice I-<7-digit sequence>', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    const { invoiceNumber } = await createInvoice(
      buildCreateInvoiceInput(refs, [asset], refs.invoiceTypeSaleId),
      refs.userId,
    )
    expect(invoiceNumber).toMatch(/^I-\d{7}$/)
  })
})
