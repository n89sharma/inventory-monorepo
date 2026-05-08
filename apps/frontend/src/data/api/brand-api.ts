import { api } from '@/data/api/axios-client'
import type { BrandForm } from '@/ui-types/brand-form-types'
import { type Brand, BrandSchema } from 'shared-types'
import { z } from 'zod'

export async function getBrands(): Promise<Brand[]> {
  const { data } = await api.get<{ success: true; data: Brand[] }>('/brands')
  return z.array(BrandSchema).parse(data.data)
}

export async function createBrand(form: BrandForm): Promise<{ id: number }> {
  return (await api.post<{ id: number }>('/brands', { name: form.name })).data
}
