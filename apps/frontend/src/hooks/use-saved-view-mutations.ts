import { createSavedView, deleteSavedView } from '@/data/api/saved-view-api'
import { invalidateSavedViews } from '@/hooks/use-saved-view'
import type { CreateSavedView, SavedViewPageKey } from 'shared-types'

async function create(body: CreateSavedView) {
  const result = await createSavedView(body)
  await invalidateSavedViews(body.page_key)
  return result
}

async function remove(pageKey: SavedViewPageKey, id: number) {
  await deleteSavedView(id)
  await invalidateSavedViews(pageKey)
}

const mutations = { create, remove } as const

export function useSavedViewMutations() {
  return mutations
}
