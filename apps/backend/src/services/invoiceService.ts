import {
  AppRole,
  AssetDelta,
  CreateInvoice,
  INVOICE_TYPE,
  InvoiceDetail,
  UpdateInvoiceMetadata,
} from 'shared-types'
import type { Prisma } from '../../generated/prisma/client.js'
import { getAssetsForInvoice } from '../../generated/prisma/sql.js'
import { mapAssetSummary } from '../lib/asset-mappers.js'
import {
  addRemoveCollectionFromAssets,
  assertAssetsNotInCollection,
  recordCollectionAssetDelta,
} from '../lib/collection-assets.js'
import { getNextSequence } from '../lib/db-utils.js'
import { ConflictError, NotFoundError } from '../lib/errors.js'
import { prisma } from '../prisma.js'
import {
  recordAssetUpdateOnCollection,
  recordCollectionUpdateOnAssets,
  recordInvoiceCreate,
  recordInvoiceUpdate,
} from './historyService.js'

const INVOICE_NUMBER_PREFIX = 'I-'
const INVOICE_NUMBER_PAD = 7

async function getNewInvoiceNumber(): Promise<string> {
  const sequence = await getNextSequence('invoice')
  return `${INVOICE_NUMBER_PREFIX}${String(sequence).padStart(INVOICE_NUMBER_PAD, '0')}`
}

type InvoiceAssetLink = {
  field: 'purchase_invoice_id' | 'sales_invoice_id'
  add: Prisma.AssetUncheckedUpdateManyInput
  remove: Prisma.AssetUncheckedUpdateManyInput
  inCollectionWhere: Prisma.AssetWhereInput
}

function invoiceAssetLink(invoiceTypeName: string, invoiceId: number): InvoiceAssetLink {
  if (invoiceTypeName === INVOICE_TYPE.sales) {
    return {
      field: 'sales_invoice_id',
      add: { sales_invoice_id: invoiceId },
      remove: { sales_invoice_id: null },
      inCollectionWhere: { sales_invoice_id: { not: null } },
    }
  }
  return {
    field: 'purchase_invoice_id',
    add: { purchase_invoice_id: invoiceId },
    remove: { purchase_invoice_id: null },
    inCollectionWhere: { purchase_invoice_id: { not: null } },
  }
}

export async function createInvoice(
  data: CreateInvoice,
  userId: number,
): Promise<{ invoiceNumber: string }> {
  const assetIds = data.assets.map((a) => a.id)
  const now = new Date()

  const invoiceType = await prisma.invoiceType.findUniqueOrThrow({
    where: { id: data.invoice_type_id },
    select: { type: true },
  })
  const invoiceNumber = await getNewInvoiceNumber()

  const invoice = await prisma.$transaction(async (tx) => {
    const created = await tx.invoice.create({
      data: {
        invoice_number: invoiceNumber,
        invoice_reference: data.invoice_reference,
        organization_id: data.organization_id,
        updated_by_id: userId,
        is_cleared: data.is_cleared,
        invoice_type_id: data.invoice_type_id,
        created_at: now,
      },
    })

    const link = invoiceAssetLink(invoiceType.type, created.id)
    await assertAssetsNotInCollection(
      tx,
      assetIds,
      link.inCollectionWhere,
      (barcodes) => new ConflictError(`Assets already in another invoice: ${barcodes.join(', ')}`),
    )

    await tx.asset.updateMany({
      where: { id: { in: assetIds } },
      data: link.add,
    })

    return created
  })

  const link = invoiceAssetLink(invoiceType.type, invoice.id)

  await recordInvoiceCreate(
    invoice.id,
    {
      invoice_number: invoice.invoice_number,
      invoice_reference: data.invoice_reference,
      organization_id: data.organization_id,
      invoice_type_id: data.invoice_type_id,
      created_at: now,
    },
    userId,
  )

  await recordCollectionUpdateOnAssets([], assetIds, link.field, invoice.id, userId)
  await recordAssetUpdateOnCollection('Invoice', invoice.id, assetIds, [], userId)

  return { invoiceNumber: invoice.invoice_number }
}

export async function patchInvoiceMetadata(
  invoiceNumber: string,
  metadata: UpdateInvoiceMetadata,
  userId: number,
): Promise<void> {
  const current = await prisma.invoice.findUnique({
    where: { invoice_number: invoiceNumber },
    select: { id: true, organization_id: true, is_cleared: true },
  })
  if (!current) throw new NotFoundError(`Invoice ${invoiceNumber} not found`)

  await prisma.invoice.update({
    where: { id: current.id },
    data: {
      organization_id: metadata.organization.id,
      is_cleared: metadata.is_cleared,
    },
  })

  await recordInvoiceUpdate(
    current.id,
    {
      organization_id: current.organization_id,
      is_cleared: current.is_cleared,
    },
    {
      organization_id: metadata.organization.id,
      is_cleared: metadata.is_cleared,
    },
    userId,
  )
}

export async function addRemoveCollectionFromAssetsAndRecord(
  invoiceNumber: string,
  delta: AssetDelta,
  userId: number,
): Promise<void> {
  const invoice = await prisma.invoice.findUnique({
    where: { invoice_number: invoiceNumber },
    select: { id: true, invoice_type: { select: { type: true } } },
  })
  if (!invoice) throw new NotFoundError(`Invoice ${invoiceNumber} not found`)

  const link = invoiceAssetLink(invoice.invoice_type.type, invoice.id)

  await prisma.$transaction((tx) =>
    addRemoveCollectionFromAssets(tx, {
      assetsToAdd: delta.assetIdsToAdd,
      assetsToRemove: delta.assetIdsToRemove,
      assetInCollectionWhere: link.inCollectionWhere,
      assetInCollectionError: (barcodes) =>
        new ConflictError(`Assets already in another invoice: ${barcodes.join(', ')}`),
      add: link.add,
      remove: link.remove,
    }),
  )

  await recordCollectionAssetDelta(
    'Invoice',
    link.field,
    invoice.id,
    delta.assetIdsToAdd,
    delta.assetIdsToRemove,
    userId,
  )
}

export async function getInvoice(invoiceNumber: string): Promise<InvoiceDetail> {
  const [invoice, assets] = await Promise.all([
    prisma.invoice.findUnique({
      where: { invoice_number: invoiceNumber },
      include: {
        updated_by: true,
        organization: true,
        invoice_type: true,
      },
    }),
    prisma.$queryRawTyped(getAssetsForInvoice(invoiceNumber)),
  ])
  if (!invoice) throw new NotFoundError(`Invoice ${invoiceNumber} not found`)
  return {
    invoice_number: invoice.invoice_number,
    invoice_reference: invoice.invoice_reference,
    invoice_type: { id: invoice.invoice_type.id, type: invoice.invoice_type.type },
    is_cleared: invoice.is_cleared,
    created_at: invoice.created_at,
    created_by: {
      id: invoice.updated_by.id,
      name: invoice.updated_by.name,
      email: invoice.updated_by.email,
      is_active: invoice.updated_by.is_active,
      role: invoice.updated_by.role as AppRole | null,
      clerk_id: invoice.updated_by.clerk_id,
      default_warehouse_id: invoice.updated_by.default_warehouse_id,
    },
    customer: invoice.organization,
    assets: assets.map(mapAssetSummary),
  }
}
