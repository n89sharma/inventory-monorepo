import { ApiResponse, CreateInvoice, InvoiceDetail, UpdateInvoice, response400, response500, successResponse } from 'shared-types'
import { getAssetsForInvoice } from '../../generated/prisma/sql.js'
import { prisma } from '../prisma.js'

export async function createInvoice(data: CreateInvoice): Promise<ApiResponse<{ invoiceNumber: string }>> {
  try {
    const existing = await prisma.invoice.findFirst({
      where: { organization_id: data.organization_id, invoice_number: data.invoice_number }
    })
    if (existing) {
      return response400(`Invoice number ${data.invoice_number} already exists for this organization`)
    }
    const assetIds = data.assets.map(a => a.id)
    const invoice = await prisma.invoice.create({
      data: {
        invoice_number: data.invoice_number,
        organization_id: data.organization_id,
        updated_by_id: 178,
        is_cleared: data.is_cleared,
        invoice_type_id: data.invoice_type_id,
        created_at: new Date()
      }
    })
    await prisma.asset.updateMany({
      where: { id: { in: assetIds } },
      data: { purchase_invoice_id: invoice.id }
    })
    return successResponse({ invoiceNumber: invoice.invoice_number })
  } catch (error) {
    return response500('Failed to create invoice')
  }
}

export async function getInvoiceForUpdate(invoiceNumber: string): Promise<ApiResponse<UpdateInvoice>> {
  try {
    const [invoice, assets] = await Promise.all([
      prisma.invoice.findFirst({
        where: { invoice_number: invoiceNumber },
        include: { organization: true, InvoiceType: true }
      }),
      prisma.$queryRawTyped(getAssetsForInvoice(invoiceNumber))
    ])
    if (!invoice) return response400(`Invoice ${invoiceNumber} not found`)
    return successResponse({
      id: invoice.id,
      invoice_number: invoice.invoice_number,
      organization: { id: invoice.organization.id, account_number: invoice.organization.account_number, name: invoice.organization.name },
      invoice_type: { id: invoice.InvoiceType.id, type: invoice.InvoiceType.type },
      is_cleared: invoice.is_cleared,
      assets
    })
  } catch {
    return response500(`Failed to fetch invoice ${invoiceNumber} for editing`)
  }
}

export async function updateInvoice(invoiceNumber: string, data: UpdateInvoice): Promise<ApiResponse<{ invoiceNumber: string }>> {
  try {
    const invoice = await prisma.invoice.findFirst({ where: { invoice_number: invoiceNumber } })
    if (!invoice) return response400(`Invoice ${invoiceNumber} not found`)

    const existingAssets = await prisma.asset.findMany({
      where: { purchase_invoice_id: invoice.id },
      select: { id: true }
    })

    const existingAssetIds = new Set(existingAssets.map(a => a.id))
    const incomingAssetIds = new Set(data.assets.map(a => a.id))

    const assetIdsToRemove = [...existingAssetIds].filter(id => !incomingAssetIds.has(id))
    const assetIdsToAdd = [...incomingAssetIds].filter(id => !existingAssetIds.has(id))

    if (assetIdsToAdd.length > 0) {
      const conflicting = await prisma.asset.findMany({
        where: { id: { in: assetIdsToAdd }, purchase_invoice_id: { not: null } },
        select: { barcode: true }
      })
      if (conflicting.length > 0) {
        return response400(`Assets already in another invoice: ${conflicting.map(a => a.barcode).join(', ')}`)
      }
    }

    await prisma.$transaction([
      prisma.invoice.update({ where: { id: invoice.id }, data: { is_cleared: data.is_cleared } }),
      prisma.asset.updateMany({ where: { id: { in: assetIdsToRemove } }, data: { purchase_invoice_id: null } }),
      prisma.asset.updateMany({ where: { id: { in: assetIdsToAdd } }, data: { purchase_invoice_id: invoice.id } })
    ])

    return successResponse({ invoiceNumber })
  } catch {
    return response500(`Failed to update invoice ${invoiceNumber}`)
  }
}

export async function getInvoice(invoiceNumber: string): Promise<ApiResponse<InvoiceDetail>> {
  try {
    const [invoice, assets] = await Promise.all([
      prisma.invoice.findFirst({
        where: { invoice_number: invoiceNumber },
        include: {
          updated_by: { include: { Role: true } },
          organization: true,
          InvoiceType: true
        }
      }),
      prisma.$queryRawTyped(getAssetsForInvoice(invoiceNumber))
    ])
    if (!invoice) {
      return response400(`Invoice ${invoiceNumber} not found`)
    }
    return successResponse({
      invoice_number: invoice.invoice_number,
      invoice_type: invoice.InvoiceType.type,
      is_cleared: invoice.is_cleared,
      created_at: invoice.created_at,
      created_by: {
        id: invoice.updated_by.id,
        username: invoice.updated_by.username,
        name: invoice.updated_by.name,
        email: invoice.updated_by.email,
        role_id: invoice.updated_by.role_id,
        role: invoice.updated_by.Role.role
      },
      customer: invoice.organization,
      assets
    })
  } catch (error) {
    return response500(`Failed to fetch invoice ${invoiceNumber}`)
  }
}
