import type { Brand, CreateBrand } from 'shared-types'
import { prisma } from '../prisma.js'

export async function listBrands(): Promise<Brand[]> {
  return prisma.brand.findMany({ orderBy: { name: 'asc' } })
}

export async function createBrand(body: CreateBrand): Promise<{ id: number }> {
  const brand = await prisma.brand.create({ data: { name: body.name } })
  return { id: brand.id }
}
