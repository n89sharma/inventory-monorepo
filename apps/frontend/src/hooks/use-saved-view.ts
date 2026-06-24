import { getSavedViews } from '@/data/api/saved-view-api'
import type { SavedViewPageKey } from 'shared-types'
import useSWR, { mutate } from 'swr'

const SAVED_VIEWS_KEY_PREFIX = 'saved-views'

type SavedViewsKey = readonly [typeof SAVED_VIEWS_KEY_PREFIX, SavedViewPageKey]

const savedViewsKey = (pageKey: SavedViewPageKey): SavedViewsKey => [
  SAVED_VIEWS_KEY_PREFIX,
  pageKey,
]

export function useSavedViews(pageKey: SavedViewPageKey) {
  return useSWR(savedViewsKey(pageKey), () => getSavedViews(pageKey))
}

export function invalidateSavedViews(pageKey: SavedViewPageKey) {
  return mutate(savedViewsKey(pageKey))
}
