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
    zones,
    errors,
    components,
    countries,
  ] = await Promise.all([
    prisma.accessory.findMany(),
    prisma.assetType.findMany(),
    prisma.brand.findMany(),
    prisma.status.findMany(),
    prisma.readiness.findMany(),
    prisma.invoiceType.findMany(),
    prisma.warehouse.findMany(),
    prisma.zone.findMany({ orderBy: { zone: 'asc' } }),
    prisma.error.findMany(),
    prisma.component.findMany({ include: { Brand: { select: { name: true } } } }),
    prisma.country.findMany({ orderBy: { name: 'asc' } }),
  ])

  return {
    coreFunctions: accessories,
    assetTypes,
    brands,
    statuses,
    readinesses,
    invoiceTypes,
    warehouses,
    zones,
    errors,
    components: components.map((c) => ({
      id: c.id,
      brand_id: c.brand_id,
      brand_name: c.Brand.name,
      name: c.name,
    })),
    countries,
  }
}
