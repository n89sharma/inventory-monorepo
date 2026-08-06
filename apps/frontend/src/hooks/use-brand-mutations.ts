import { createBrand as createBrandApi } from '@/data/api/brand-api'
import { invalidateReferenceData } from '@/hooks/use-reference-data'
import type { BrandForm } from '@/ui-types/brand-form-types'

async function createBrand(form: BrandForm): Promise<{ id: number }> {
  const result = await createBrandApi(form)
  invalidateReferenceData()
  return result
}

const mutations = {
  createBrand,
} as const

export function useBrandMutations() {
  return mutations
}
