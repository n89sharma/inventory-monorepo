import { ApiResponse, ReferenceData, response500, successResponse } from 'shared-types'
import { prisma } from '../prisma.js'

export async function getReferenceData(): Promise<ApiResponse<ReferenceData>> {
  try {
    const [
      accessories,
      assetTypes,
      trackingStatuses,
      availabilityStatuses,
      technicalStatuses,
      roles,
      invoiceTypes,
      warehouses
    ] = await Promise.all([
      prisma.accessory.findMany(),
      prisma.assetType.findMany(),
      prisma.trackingStatus.findMany(),
      prisma.availabilityStatus.findMany(),
      prisma.technicalStatus.findMany(),
      prisma.role.findMany(),
      prisma.invoiceType.findMany(),
      prisma.warehouse.findMany()
    ])

    return successResponse({
      coreFunctions: accessories,
      assetTypes,
      trackingStatuses,
      availabilityStatuses,
      technicalStatuses,
      roles,
      invoiceTypes,
      warehouses
    })
  } catch (error) {
    return response500('Failed to fetch reference data')
  }
}
