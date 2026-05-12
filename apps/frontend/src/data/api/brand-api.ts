import { api } from '@/data/api/axios-client'
import type { BrandForm } from '@/ui-types/brand-form-types'
import { type Brand, BrandSchema, type CreateBrand, CreateBrandSchema } from 'shared-types'
import { z } from 'zod'

const CreateBrandResponseSchema = z.object({ id: z.number() })

export async function getBrands(): Promise<Brand[]> {
  const { data } = await api.get<Brand[]>('/brands')
  return z.array(BrandSchema).parse(data)
}

export async function createBrand(form: BrandForm): Promise<{ id: number }> {
  const createBrandBody = CreateBrandSchema.parse({ name: form.name } satisfies CreateBrand)
  const { data } = await api.post<{ id: number }>('/brands', createBrandBody)
  return CreateBrandResponseSchema.parse(data)
}
