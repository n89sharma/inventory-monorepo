import { api } from '@/data/api/axios-client'
import { apiErrorHandler } from '@/lib/error-handler'
import type { BrandForm } from '@/ui-types/brand-form-types'
import { type ApiResponse, type Brand, BrandSchema } from 'shared-types'
import type { AxiosResponse } from 'axios'
import { z } from 'zod'

export async function getBrands(): Promise<Brand[]> {
  const { data } = await api.get<ApiResponse<Brand[]>>('/brands')
  if (data.success) return z.array(BrandSchema).parse(data.data)
  throw new Error(data.error.summary)
}

export async function createBrand(form: BrandForm): Promise<ApiResponse<{ id: number }>> {
  return api.post('/brands', { name: form.name }, { headers: { 'Content-Type': 'application/json' } })
    .then((res: AxiosResponse<{ id: number }>) => ({ success: true as const, data: res.data }))
    .catch(apiErrorHandler<{ id: number }>)
}
