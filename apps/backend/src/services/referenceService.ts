import { ApiResponse, ReferenceData, response500, successResponse } from 'shared-types'
import { prisma } from '../prisma.js'

export async function getReferenceData(): Promise<ApiResponse<ReferenceData>> {
  try {
    const [
      accessories,
      assetTypes,
      brands,
      trackingStatuses,
      availabilityStatuses,
      technicalStatuses,
      roles,
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
      prisma.role.findMany(),
      prisma.invoiceType.findMany(),
      prisma.warehouse.findMany(),
      prisma.error.findMany()
    ])

    return successResponse({
      coreFunctions: accessories,
      assetTypes,
      brands,
      trackingStatuses,
      availabilityStatuses,
      technicalStatuses,
      roles,
      invoiceTypes,
      warehouses,
      errors
    })
  } catch (error) {
    return response500('Failed to fetch reference data')
  }
}
