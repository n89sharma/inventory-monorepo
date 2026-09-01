import { createBrand as createBrandApi, updateBrand as updateBrandApi } from '@/data/api/brand-api'
import { invalidateModels } from '@/hooks/use-model'
import { invalidateReferenceData } from '@/hooks/use-reference-data'
import type { BrandForm } from '@/ui-types/brand-form-types'

async function createBrand(form: BrandForm): Promise<{ id: number }> {
  const result = await createBrandApi(form)
  invalidateReferenceData()
  return result
}

async function updateBrand(id: number, form: BrandForm): Promise<void> {
  await updateBrandApi(id, form)
  invalidateReferenceData()
  // A rename changes brand_name on every row of GET /models, which is its own cache key.
  invalidateModels()
}

const mutations = {
  createBrand,
  updateBrand,
} as const

export function useBrandMutations() {
  return mutations
}
