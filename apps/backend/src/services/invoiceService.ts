import { AppRole, CreateInvoice, InvoiceDetail, UpdateInvoice } from 'shared-types'
import { getAssetsForInvoice } from '../../generated/prisma/sql.js'
import { ConflictError, NotFoundError } from '../lib/errors.js'
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

export async function getInvoiceForUpdate(invoiceNumber: string): Promise<UpdateInvoice> {
  const [invoice, assets] = await Promise.all([
    prisma.invoice.findFirst({
      where: { invoice_number: invoiceNumber },
      include: { organization: true, InvoiceType: true }
    }),
    prisma.$queryRawTyped(getAssetsForInvoice(invoiceNumber))
  ])
  if (!invoice) throw new NotFoundError(`Invoice ${invoiceNumber} not found`)
  return {
    id: invoice.id,
    invoice_number: invoice.invoice_number,
    organization: {
      id: invoice.organization.id,
      account_number: invoice.organization.account_number,
      name: invoice.organization.name
    },
    invoice_type: { id: invoice.InvoiceType.id, type: invoice.InvoiceType.type },
    is_cleared: invoice.is_cleared,
    assets
  }
}

export async function updateInvoice(
  invoiceNumber: string,
  data: UpdateInvoice,
  userId: number
): Promise<{ invoiceNumber: string }> {
  const { invoice, assetIdsToRemove, assetIdsToAdd } = await prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findFirst({ where: { invoice_number: invoiceNumber } })
    if (!invoice) throw new NotFoundError(`Invoice ${invoiceNumber} not found`)

    const existingAssets = await tx.asset.findMany({
      where: { purchase_invoice_id: invoice.id },
      select: { id: true }
    })

    const existingAssetIds = new Set(existingAssets.map(a => a.id))
    const incomingAssetIds = new Set(data.assets.map(a => a.id))
    const assetIdsToRemove = [...existingAssetIds].filter(id => !incomingAssetIds.has(id))
    const assetIdsToAdd = [...incomingAssetIds].filter(id => !existingAssetIds.has(id))

    if (assetIdsToAdd.length > 0) {
      const conflicting = await tx.asset.findMany({
        where: { id: { in: assetIdsToAdd }, purchase_invoice_id: { not: null } },
        select: { barcode: true }
      })
      if (conflicting.length > 0) {
        throw new ConflictError(
          `Assets already in another invoice: ${conflicting.map(a => a.barcode).join(', ')}`
        )
      }
    }

    await tx.invoice.update({
      where: { id: invoice.id },
      data: { is_cleared: data.is_cleared }
    })

    await tx.asset.updateMany({
      where: { id: { in: assetIdsToRemove } },
      data: { purchase_invoice_id: null }
    })

    await tx.asset.updateMany({
      where: { id: { in: assetIdsToAdd } },
      data: { purchase_invoice_id: invoice.id }
    })

    return { invoice, assetIdsToRemove, assetIdsToAdd }
  })

  await recordInvoiceUpdate(invoice.id, { is_cleared: invoice.is_cleared }, { is_cleared: data.is_cleared }, userId)
  await recordCollectionUpdateOnAssets(assetIdsToRemove, assetIdsToAdd, 'purchase_invoice_id', invoice.id, userId)
  await recordAssetUpdateOnCollection('Invoice', invoice.id, assetIdsToAdd, assetIdsToRemove, userId)

  return { invoiceNumber }
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
    invoice_type: invoice.InvoiceType.type,
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
    assets
  }
}
