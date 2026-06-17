import { AppRole, AssetDelta, CreateInvoice, InvoiceDetail, UpdateInvoiceMetadata } from 'shared-types'
import type { Prisma } from '../../generated/prisma/client.js'
import { getAssetsForInvoice } from '../../generated/prisma/sql.js'
import { ConflictError, NotFoundError } from '../lib/errors.js'
import { mapAssetSummary } from '../lib/asset-mappers.js'
import { recordAssetUpdateOnCollection, recordCollectionUpdateOnAssets, recordInvoiceCreate, recordInvoiceUpdate } from './historyService.js'
import { prisma } from '../prisma.js'

export async function createInvoice(
  data: CreateInvoice,
  userId: number
): Promise<{ invoiceNumber: string }> {
  const assetIds = data.assets.map(a => a.id)
  const now = new Date()

  const invoice = await prisma.$transaction(async (tx) => {
    const existing = await tx.invoice.findFirst({
      where: { organization_id: data.organization_id, invoice_number: data.invoice_number }
    })
    if (existing) {
      throw new ConflictError(
        `Invoice number ${data.invoice_number} already exists for this organization`
      )
    }

    const created = await tx.invoice.create({
      data: {
        invoice_number: data.invoice_number,
        organization_id: data.organization_id,
        updated_by_id: userId,
        is_cleared: data.is_cleared,
        invoice_type_id: data.invoice_type_id,
        created_at: now
      }
    })

    await tx.asset.updateMany({
      where: { id: { in: assetIds } },
      data: { purchase_invoice_id: created.id }
    })

    return created
  })

  await recordInvoiceCreate(invoice.id, {
    invoice_number: data.invoice_number,
    organization_id: data.organization_id,
    invoice_type_id: data.invoice_type_id,
    created_at: now
  }, userId)

  await recordCollectionUpdateOnAssets([], assetIds, 'purchase_invoice_id', invoice.id, userId)
  await recordAssetUpdateOnCollection('Invoice', invoice.id, assetIds, [], userId)

  return { invoiceNumber: invoice.invoice_number }
}

export async function patchInvoiceMetadata(
  invoiceNumber: string,
  metadata: UpdateInvoiceMetadata,
  userId: number
): Promise<void> {
  const current = await prisma.invoice.findFirst({
    where: { invoice_number: invoiceNumber },
    select: { id: true, organization_id: true, invoice_type_id: true, is_cleared: true }
  })
  if (!current) throw new NotFoundError(`Invoice ${invoiceNumber} not found`)

  await prisma.invoice.update({
    where: { id: current.id },
    data: {
      organization_id: metadata.organization.id,
      invoice_type_id: metadata.invoice_type.id,
      is_cleared: metadata.is_cleared
    }
  })

  await recordInvoiceUpdate(current.id, {
    organization_id: current.organization_id,
    invoice_type_id: current.invoice_type_id,
    is_cleared: current.is_cleared
  }, {
    organization_id: metadata.organization.id,
    invoice_type_id: metadata.invoice_type.id,
    is_cleared: metadata.is_cleared
  }, userId)
}

export async function patchInvoiceAssets(
  invoiceNumber: string,
  delta: AssetDelta,
  userId: number
): Promise<void> {
  const invoice = await prisma.invoice.findFirst({
    where: { invoice_number: invoiceNumber },
    select: { id: true }
  })
  if (!invoice) throw new NotFoundError(`Invoice ${invoiceNumber} not found`)

  await prisma.$transaction(async (tx) => {
    await applyInvoiceAssetDelta(tx, invoice.id, delta.assetIdsToAdd, delta.assetIdsToRemove)
  })

  await recordCollectionUpdateOnAssets(
    delta.assetIdsToRemove,
    delta.assetIdsToAdd,
    'purchase_invoice_id',
    invoice.id,
    userId
  )
  await recordAssetUpdateOnCollection(
    'Invoice',
    invoice.id,
    delta.assetIdsToAdd,
    delta.assetIdsToRemove,
    userId
  )
}

async function applyInvoiceAssetDelta(
  tx: Prisma.TransactionClient,
  invoiceId: number,
  assetIdsToAdd: number[],
  assetIdsToRemove: number[]
): Promise<void> {
  if (assetIdsToAdd.length > 0) {
    const conflicts = await tx.asset.findMany({
      where: { id: { in: assetIdsToAdd }, purchase_invoice_id: { not: null } },
      select: { barcode: true }
    })
    if (conflicts.length > 0) {
      throw new ConflictError(
        `Assets already in another invoice: ${conflicts.map(a => a.barcode).join(', ')}`
      )
    }
  }

  if (assetIdsToRemove.length > 0) {
    await tx.asset.updateMany({
      where: { id: { in: assetIdsToRemove } },
      data: { purchase_invoice_id: null }
    })
  }

  if (assetIdsToAdd.length > 0) {
    await tx.asset.updateMany({
      where: { id: { in: assetIdsToAdd } },
      data: { purchase_invoice_id: invoiceId }
    })
  }
}

export async function getInvoice(invoiceNumber: string): Promise<InvoiceDetail> {
  const [invoice, assets] = await Promise.all([
    prisma.invoice.findFirst({
      where: { invoice_number: invoiceNumber },
      include: {
        updated_by: true,
        organization: true,
        InvoiceType: true
      }
    }),
    prisma.$queryRawTyped(getAssetsForInvoice(invoiceNumber))
  ])
  if (!invoice) throw new NotFoundError(`Invoice ${invoiceNumber} not found`)
  return {
    invoice_number: invoice.invoice_number,
    invoice_type: { id: invoice.InvoiceType.id, type: invoice.InvoiceType.type },
    is_cleared: invoice.is_cleared,
    created_at: invoice.created_at,
    created_by: {
      id: invoice.updated_by.id,
      name: invoice.updated_by.name,
      email: invoice.updated_by.email,
      is_active: invoice.updated_by.is_active,
      role: invoice.updated_by.role as AppRole | null,
      clerk_id: invoice.updated_by.clerk_id,
    },
    customer: invoice.organization,
    assets: assets.map(mapAssetSummary)
  }
}
