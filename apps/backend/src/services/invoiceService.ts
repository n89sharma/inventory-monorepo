import { ApiResponse, CreateInvoice, InvoiceDetail, response400, response500, successResponse } from 'shared-types'
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
