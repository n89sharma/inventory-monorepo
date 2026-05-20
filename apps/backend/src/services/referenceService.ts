import { ReferenceData } from 'shared-types'
import { prisma } from '../prisma.js'

export async function getReferenceData(): Promise<ReferenceData> {
  const [
    accessories,
    assetTypes,
    brands,
    statuses,
    readinesses,
    invoiceTypes,
    warehouses,
    errors
  ] = await Promise.all([
    prisma.accessory.findMany(),
    prisma.assetType.findMany(),
    prisma.brand.findMany(),
    prisma.status.findMany(),
    prisma.readiness.findMany(),
    prisma.invoiceType.findMany(),
    prisma.warehouse.findMany(),
    prisma.error.findMany()
  ])

  return {
    coreFunctions: accessories,
    assetTypes,
    brands,
    statuses,
    readinesses,
    invoiceTypes,
    warehouses,
    errors
  }
}
