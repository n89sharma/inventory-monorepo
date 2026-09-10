import { ASSET_STATUS, INVOICE_TYPE, OUTGOING_STATUS } from 'shared-types'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import {
  ArrivalTestData,
  buildCreateDepartureInput,
  buildCreateInvoiceInput,
  cleanupTransactionalData,
  createArrivedAssets,
  getAssetStatus,
  assetCostOf,
  ALL_PRICE_PERMISSIONS,
  NO_PERMISSIONS,
  SALE_PRICE_ONLY,
  REDACTED_ASSET_COST,
  seedArrivalTestData,
  seedAssetCost,
  SEEDED_ASSET_COST,
} from '../../test/factories.js'
import { ConflictError, NotFoundError } from '../lib/errors.js'
import { prisma } from '../prisma.js'
import { createDeparture } from './departureService.js'
import {
  addRemoveCollectionFromAssetsAndRecord as patchInvoiceAssets,
  createInvoice,
  deleteInvoice,
  getInvoice,
  getInvoices,
  patchInvoiceMetadata,
} from './invoiceService.js'

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

    const created = await getInvoice(invoiceNumber, ALL_PRICE_PERMISSIONS)
    expect(created.notes).toBe('initial note')

    await patchInvoiceMetadata(
      invoiceNumber,
      {
        organization: refs.customer,
        invoice_reference: created.invoice_reference,
        invoice_date: created.invoice_date,
        is_cleared: created.is_cleared,
        comment: 'updated note',
      },
      refs.userId,
    )
    expect((await getInvoice(invoiceNumber, ALL_PRICE_PERMISSIONS)).notes).toBe('updated note')

    await patchInvoiceMetadata(
      invoiceNumber,
      {
        organization: refs.customer,
        invoice_reference: created.invoice_reference,
        invoice_date: created.invoice_date,
        is_cleared: created.is_cleared,
        comment: null,
      },
      refs.userId,
    )
    expect((await getInvoice(invoiceNumber, ALL_PRICE_PERMISSIONS)).notes).toBeNull()
  })

  it('persists invoice_date on create and edits date + reference via metadata patch', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    const { invoiceNumber } = await createInvoice(
      {
        ...buildCreateInvoiceInput(refs, [asset], refs.invoiceTypeSaleId),
        invoice_reference: 'REF-BEFORE',
        invoice_date: '2026-01-15',
      },
      refs.userId,
    )

    const created = await getInvoice(invoiceNumber, ALL_PRICE_PERMISSIONS)
    expect(created.invoice_date).toBe('2026-01-15')
    expect(created.invoice_reference).toBe('REF-BEFORE')

    await patchInvoiceMetadata(
      invoiceNumber,
      {
        organization: refs.customer,
        invoice_reference: 'REF-AFTER',
        invoice_date: '2026-02-20',
        is_cleared: created.is_cleared,
        comment: created.notes,
      },
      refs.userId,
    )

    const updated = await getInvoice(invoiceNumber, ALL_PRICE_PERMISSIONS)
    expect(updated.invoice_date).toBe('2026-02-20')
    expect(updated.invoice_reference).toBe('REF-AFTER')
  })

  it('returns asset cost, redacted by role permissions', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    const { invoiceNumber } = await createInvoice(
      buildCreateInvoiceInput(refs, [asset], refs.invoiceTypeSaleId),
      refs.userId,
    )
    await seedAssetCost(asset.id)

    const asAdmin = await getInvoice(invoiceNumber, ALL_PRICE_PERMISSIONS)
    expect(assetCostOf(asAdmin.assets[0])).toEqual(SEEDED_ASSET_COST)

    const asSales = await getInvoice(invoiceNumber, SALE_PRICE_ONLY)
    expect(assetCostOf(asSales.assets[0])).toEqual({
      ...REDACTED_ASSET_COST,
      sale_price: SEEDED_ASSET_COST.sale_price,
    })

    const asMember = await getInvoice(invoiceNumber, NO_PERMISSIONS)
    expect(assetCostOf(asMember.assets[0])).toEqual(REDACTED_ASSET_COST)
  })

  it('returns the distinct arrivals of the invoiced assets', async () => {
    const firstBatch = await createArrivedAssets(refs, 2)
    const secondBatch = await createArrivedAssets(refs, 1)
    const { invoiceNumber } = await createInvoice(
      buildCreateInvoiceInput(refs, [...firstBatch, ...secondBatch], refs.invoiceTypeSaleId),
      refs.userId,
    )

    const invoice = await getInvoice(invoiceNumber, ALL_PRICE_PERMISSIONS)

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

describe('deleteInvoice', () => {
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

  it('deletes an invoice that holds no assets', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    const { invoiceNumber } = await createInvoice(
      buildCreateInvoiceInput(refs, [asset], refs.invoiceTypeSaleId),
      refs.userId,
    )
    await patchInvoiceAssets(
      invoiceNumber,
      { assetIdsToAdd: [], assetIdsToRemove: [asset.id] },
      refs.userId,
    )

    await deleteInvoice(invoiceNumber, refs.userId)

    expect(await prisma.invoice.findUnique({ where: { invoice_number: invoiceNumber } })).toBeNull()
  })

  it('refuses to delete an invoice that still holds assets', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    const { invoiceNumber } = await createInvoice(
      buildCreateInvoiceInput(refs, [asset], refs.invoiceTypeSaleId),
      refs.userId,
    )

    await expect(deleteInvoice(invoiceNumber, refs.userId)).rejects.toThrow(
      new ConflictError(`Invoice ${invoiceNumber} cannot be deleted because it still has 1 asset`),
    )
  })

  it('deletes an emptied purchase invoice even when it is cleared', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    const { invoiceNumber } = await createInvoice(
      buildCreateInvoiceInput(refs, [asset], refs.invoiceTypePurchaseId, true),
      refs.userId,
    )
    await patchInvoiceAssets(
      invoiceNumber,
      { assetIdsToAdd: [], assetIdsToRemove: [asset.id] },
      refs.userId,
    )

    await deleteInvoice(invoiceNumber, refs.userId)

    expect(await prisma.invoice.findUnique({ where: { invoice_number: invoiceNumber } })).toBeNull()
  })

  it('throws when the invoice number does not exist', async () => {
    await expect(deleteInvoice('I-9999999', refs.userId)).rejects.toThrow(NotFoundError)
  })
})

const FEBRUARY_WINDOW = {
  fromDate: new Date('2026-02-01T00:00:00.000Z'),
  toDate: new Date('2026-02-28T23:59:59.999Z'),
}
const MARCH_WINDOW = {
  fromDate: new Date('2026-03-01T00:00:00.000Z'),
  toDate: new Date('2026-03-31T23:59:59.999Z'),
}
const APRIL_WINDOW = {
  fromDate: new Date('2026-04-01T00:00:00.000Z'),
  toDate: new Date('2026-04-30T23:59:59.999Z'),
}

function atUtcNoon(ymd: string): Date {
  return new Date(`${ymd}T12:00:00.000Z`)
}

async function setArrivalDate(assetId: number, ymd: string): Promise<void> {
  const { arrival_id } = await prisma.asset.findUniqueOrThrow({
    where: { id: assetId },
    select: { arrival_id: true },
  })
  if (arrival_id === null) throw new Error(`Asset ${assetId} has no arrival`)
  await prisma.arrival.update({ where: { id: arrival_id }, data: { created_at: atUtcNoon(ymd) } })
}

async function setDepartureDate(departureNumber: string, ymd: string): Promise<void> {
  await prisma.departure.update({
    where: { departure_number: departureNumber },
    data: { created_at: atUtcNoon(ymd) },
  })
}

async function setInvoiceDate(invoiceNumber: string, ymd: string): Promise<void> {
  await prisma.invoice.update({
    where: { invoice_number: invoiceNumber },
    data: { invoice_date: new Date(`${ymd}T00:00:00.000Z`) },
  })
}

async function detachArrival(assetId: number): Promise<void> {
  await prisma.asset.update({ where: { id: assetId }, data: { arrival_id: null } })
}

async function listPurchaseInvoices(window: typeof MARCH_WINDOW) {
  return getInvoices(window.fromDate, window.toDate, INVOICE_TYPE.purchase, ALL_PRICE_PERMISSIONS)
}

async function listSalesInvoices(window: typeof MARCH_WINDOW) {
  return getInvoices(window.fromDate, window.toDate, INVOICE_TYPE.sales, ALL_PRICE_PERMISSIONS)
}

describe('invoiceService.getInvoices date window', () => {
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

  it('matches a purchase invoice on its arrival date, not its invoice date', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    const { invoiceNumber } = await createInvoice(
      buildCreateInvoiceInput(refs, [asset], refs.invoiceTypePurchaseId),
      refs.userId,
    )
    await setInvoiceDate(invoiceNumber, '2026-02-10')
    await setArrivalDate(asset.id, '2026-03-05')

    expect((await listPurchaseInvoices(MARCH_WINDOW)).map((i) => i.invoice_number)).toEqual([
      invoiceNumber,
    ])
    expect(await listPurchaseInvoices(FEBRUARY_WINDOW)).toEqual([])
  })

  it('matches an invoice spanning two months in either month and reports the span', async () => {
    const [firstAsset] = await createArrivedAssets(refs, 1)
    const [secondAsset] = await createArrivedAssets(refs, 1)
    const { invoiceNumber } = await createInvoice(
      buildCreateInvoiceInput(refs, [firstAsset, secondAsset], refs.invoiceTypePurchaseId),
      refs.userId,
    )
    await setArrivalDate(firstAsset.id, '2026-03-28')
    await setArrivalDate(secondAsset.id, '2026-04-02')

    const [march] = await listPurchaseInvoices(MARCH_WINDOW)
    const [april] = await listPurchaseInvoices(APRIL_WINDOW)

    expect(march?.invoice_number).toBe(invoiceNumber)
    expect(april?.invoice_number).toBe(invoiceNumber)
    expect(march?.arrival_start_date).toBe('2026-03-28')
    expect(march?.arrival_end_date).toBe('2026-04-02')
  })

  it('falls back to the invoice date when no asset is linked to an arrival', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    const { invoiceNumber } = await createInvoice(
      buildCreateInvoiceInput(refs, [asset], refs.invoiceTypePurchaseId),
      refs.userId,
    )
    await setInvoiceDate(invoiceNumber, '2026-03-10')
    await detachArrival(asset.id)

    const [march] = await listPurchaseInvoices(MARCH_WINDOW)

    expect(march?.invoice_number).toBe(invoiceNumber)
    expect(march?.arrival_start_date).toBeNull()
    expect(await listPurchaseInvoices(FEBRUARY_WINDOW)).toEqual([])
  })

  it('matches a sales invoice on its departure date and keeps it out of the purchase list', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    const departureNumber = await createDeparture(
      buildCreateDepartureInput(refs, [{ id: asset.id, outgoing_status: OUTGOING_STATUS.SOLD }]),
      refs.userId,
    )
    const { invoiceNumber } = await createInvoice(
      buildCreateInvoiceInput(refs, [asset], refs.invoiceTypeSaleId),
      refs.userId,
    )
    await setInvoiceDate(invoiceNumber, '2026-01-15')
    await setDepartureDate(departureNumber, '2026-03-20')
    await setArrivalDate(asset.id, '2026-03-05')

    const [march] = await listSalesInvoices(MARCH_WINDOW)

    expect(march?.invoice_number).toBe(invoiceNumber)
    expect(march?.departure_start_date).toBe('2026-03-20')
    expect(march?.departure_end_date).toBe('2026-03-20')
    expect(await listPurchaseInvoices(MARCH_WINDOW)).toEqual([])
  })
})
