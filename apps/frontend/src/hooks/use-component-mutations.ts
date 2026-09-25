import {
  createComponent as createComponentApi,
  mergeComponents as mergeComponentsApi,
  updateComponent as updateComponentApi,
} from '@/data/api/component-api'
import { invalidateComponents } from '@/hooks/use-component'
import { invalidateReferenceData } from '@/hooks/use-reference-data'
import type { ComponentForm } from '@/ui-types/component-form-types'

function invalidateComponentCaches() {
  invalidateComponents()
  invalidateReferenceData()
}

async function createComponent(form: ComponentForm): Promise<{ id: number }> {
  const result = await createComponentApi(form)
  invalidateComponentCaches()
  return result
}

async function updateComponent(id: number, form: ComponentForm): Promise<void> {
  await updateComponentApi(id, form)
  invalidateComponentCaches()
}

async function mergeComponents(ids: number[], form: ComponentForm): Promise<{ id: number }> {
  const result = await mergeComponentsApi(ids, form)
  invalidateComponentCaches()
  return result
}

const mutations = {
  createComponent,
  updateComponent,
  mergeComponents,
} as const

export function useComponentMutations() {
  return mutations
}
