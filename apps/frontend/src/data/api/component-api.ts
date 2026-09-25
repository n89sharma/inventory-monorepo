import { api } from '@/data/api/axios-client'
import type { ComponentForm } from '@/ui-types/component-form-types'
import {
  type ComponentMergePreview,
  ComponentMergePreviewSchema,
  type ComponentSummary,
  ComponentSummarySchema,
  type CreateComponent,
  CreateComponentSchema,
  type MergeComponent,
  MergeComponentSchema,
  type UpdateComponent,
  UpdateComponentSchema,
} from 'shared-types'
import { z } from 'zod'

const ComponentIdResponseSchema = z.object({ id: z.number() })

export async function getComponents(): Promise<ComponentSummary[]> {
  const { data } = await api.get<ComponentSummary[]>('/components')
  return z.array(ComponentSummarySchema).parse(data)
}

export async function createComponent(form: ComponentForm): Promise<{ id: number }> {
  const createComponentBody = CreateComponentSchema.parse({
    name: form.name,
    brand_id: form.brand!.id,
    is_active: form.is_active,
  } satisfies CreateComponent)
  const { data } = await api.post<{ id: number }>('/components', createComponentBody)
  return ComponentIdResponseSchema.parse(data)
}

export async function updateComponent(id: number, form: ComponentForm): Promise<void> {
  const updateComponentBody = UpdateComponentSchema.parse({
    name: form.name,
    brand_id: form.brand!.id,
    is_active: form.is_active,
  } satisfies UpdateComponent)
  await api.patch(`/components/${id}`, updateComponentBody)
}

export async function previewComponentMerge(ids: number[]): Promise<ComponentMergePreview> {
  const { data } = await api.post<ComponentMergePreview>('/components/merge/preview', { ids })
  return ComponentMergePreviewSchema.parse(data)
}

export async function mergeComponents(ids: number[], form: ComponentForm): Promise<{ id: number }> {
  const mergeComponentsBody = MergeComponentSchema.parse({
    ids,
    component: { name: form.name, is_active: form.is_active },
  } satisfies MergeComponent)
  const { data } = await api.post<{ id: number }>('/components/merge', mergeComponentsBody)
  return ComponentIdResponseSchema.parse(data)
}
