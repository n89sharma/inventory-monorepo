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

    const created = await getInvoice(invoiceNumber)
    expect(created.notes).toBe('initial note')

    await patchInvoiceMetadata(
      invoiceNumber,
      { organization: refs.customer, is_cleared: created.is_cleared, comment: 'updated note' },
      refs.userId,
    )
    expect((await getInvoice(invoiceNumber)).notes).toBe('updated note')

    await patchInvoiceMetadata(
      invoiceNumber,
      { organization: refs.customer, is_cleared: created.is_cleared, comment: null },
      refs.userId,
    )
    expect((await getInvoice(invoiceNumber)).notes).toBeNull()
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
