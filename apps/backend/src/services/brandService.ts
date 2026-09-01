import type { Brand, CreateBrand, UpdateBrand } from 'shared-types'
import { normalizeName } from 'shared-types'
import { ConflictError, NotFoundError } from '../lib/errors.js'
import { prisma } from '../prisma.js'
import type { Prisma } from '../../generated/prisma/client.js'

async function assertNameAvailable(
  tx: Prisma.TransactionClient,
  name: string,
  excludeId: number | null,
): Promise<void> {
  const conflict = await tx.brand.findFirst({
    where: {
      name_normalized: normalizeName(name),
      ...(excludeId === null ? {} : { id: { not: excludeId } }),
    },
    select: { name: true },
  })
  if (conflict) throw new ConflictError(`A brand named "${conflict.name}" already exists`)
}

export async function listBrands(): Promise<Brand[]> {
  return prisma.brand.findMany({ orderBy: { name: 'asc' } })
}

export async function createBrand(body: CreateBrand): Promise<{ id: number }> {
  return prisma.$transaction(async (tx) => {
    await assertNameAvailable(tx, body.name, null)
    const brand = await tx.brand.create({ data: { name: body.name } })
    return { id: brand.id }
  })
}

export async function updateBrand(id: number, body: UpdateBrand): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const existing = await tx.brand.findUnique({ where: { id }, select: { id: true } })
    if (!existing) throw new NotFoundError(`Brand ${id} not found`)

    await assertNameAvailable(tx, body.name, id)
    await tx.brand.update({ where: { id }, data: { name: body.name } })
  })
}
