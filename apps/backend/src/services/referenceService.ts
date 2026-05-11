import { ReferenceData } from 'shared-types'
import { prisma } from '../prisma.js'

export async function getReferenceData(): Promise<ReferenceData> {
  const [
    accessories,
    assetTypes,
    brands,
    trackingStatuses,
    availabilityStatuses,
    technicalStatuses,
    invoiceTypes,
    warehouses,
    errors
  ] = await Promise.all([
    prisma.accessory.findMany(),
    prisma.assetType.findMany(),
    prisma.brand.findMany(),
    prisma.trackingStatus.findMany(),
    prisma.availabilityStatus.findMany(),
    prisma.technicalStatus.findMany(),
    prisma.invoiceType.findMany(),
    prisma.warehouse.findMany(),
    prisma.error.findMany()
  ])

  return {
    coreFunctions: accessories,
    assetTypes,
    brands,
    trackingStatuses,
    availabilityStatuses,
    technicalStatuses,
    invoiceTypes,
    warehouses,
    errors
  }
}
