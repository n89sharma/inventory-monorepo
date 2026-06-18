import { api } from '@/data/api/axios-client'
import type { CreateSavedView, SavedViewPageKey, SavedViewSummary } from 'shared-types'
import { CreateSavedViewSchema, SavedViewSummarySchema } from 'shared-types'
import { z } from 'zod'

const CreateSavedViewResponseSchema = z.object({ id: z.number().int() })
type CreateSavedViewResponse = z.infer<typeof CreateSavedViewResponseSchema>

export async function getSavedViews(
  pageKey: SavedViewPageKey
): Promise<SavedViewSummary[]> {
  const { data } = await api.get<SavedViewSummary[]>('/saved-views', {
    params: { pageKey },
  })
  return z.array(SavedViewSummarySchema).parse(data)
}

export async function createSavedView(
  body: CreateSavedView
): Promise<CreateSavedViewResponse> {
  const createSavedViewBody = CreateSavedViewSchema.parse(body satisfies CreateSavedView)
  const { data } = await api.post<CreateSavedViewResponse>('/saved-views', createSavedViewBody)
  return CreateSavedViewResponseSchema.parse(data)
}

export async function deleteSavedView(id: number): Promise<void> {
  await api.delete(`/saved-views/${id}`)
}
