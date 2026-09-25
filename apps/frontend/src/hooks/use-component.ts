import { getComponents, previewComponentMerge } from '@/data/api/component-api'
import { CATALOG_DATA_OPTIONS } from '@/lib/swr-options'
import type { ComponentMergePreview, ComponentSummary } from 'shared-types'
import useSWR, { mutate } from 'swr'

const COMPONENTS_KEY = 'components'
const COMPONENT_MERGE_PREVIEW_KEY = 'component-merge-preview'
const EMPTY_COMPONENTS: ComponentSummary[] = []

export function useComponents(): ComponentSummary[] {
  const { data } = useSWR(COMPONENTS_KEY, getComponents, CATALOG_DATA_OPTIONS)
  return data ?? EMPTY_COMPONENTS
}

export function invalidateComponents() {
  return mutate(COMPONENTS_KEY)
}

export function useComponentMergePreview(ids: number[]): ComponentMergePreview | undefined {
  const sortedIds = [...ids].sort((a, b) => a - b)
  const { data } = useSWR(
    sortedIds.length > 1 ? [COMPONENT_MERGE_PREVIEW_KEY, ...sortedIds] : null,
    () => previewComponentMerge(sortedIds),
  )
  return data
}
