import { api } from '@/data/api/axios-client'
import type { BrandForm } from '@/ui-types/brand-form-types'
import {
  type CreateBrand,
  CreateBrandSchema,
  type UpdateBrand,
  UpdateBrandSchema,
} from 'shared-types'
import { z } from 'zod'

const CreateBrandResponseSchema = z.object({ id: z.number() })

export async function createBrand(form: BrandForm): Promise<{ id: number }> {
  const createBrandBody = CreateBrandSchema.parse({ name: form.name } satisfies CreateBrand)
  const { data } = await api.post<{ id: number }>('/brands', createBrandBody)
  return CreateBrandResponseSchema.parse(data)
}

export async function updateBrand(id: number, form: BrandForm): Promise<void> {
  const updateBrandBody = UpdateBrandSchema.parse({ name: form.name } satisfies UpdateBrand)
  await api.patch(`/brands/${id}`, updateBrandBody)
}
