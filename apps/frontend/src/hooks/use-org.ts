import { getOrgs, previewOrgMerge } from '@/data/api/org-api'
import { CATALOG_DATA_OPTIONS } from '@/lib/swr-options'
import type { OrgDetail, OrgMergePreview } from 'shared-types'
import useSWR, { mutate } from 'swr'

const ORGS_KEY = 'orgs'
const ORG_MERGE_PREVIEW_KEY = 'org-merge-preview'
const EMPTY_ORGS: OrgDetail[] = []

export function useOrgs(): OrgDetail[] {
  const { data } = useSWR(ORGS_KEY, getOrgs, CATALOG_DATA_OPTIONS)
  return data ?? EMPTY_ORGS
}

export function invalidateOrgs() {
  return mutate(ORGS_KEY)
}

// Which row wins the merge, and how many references each one carries. Keyed by the ids so
// changing the selection refetches; null until the dialog is open and a merge is possible.
export function useOrgMergePreview(ids: number[]): OrgMergePreview | undefined {
  const sortedIds = [...ids].sort((a, b) => a - b)
  const { data } = useSWR(sortedIds.length > 1 ? [ORG_MERGE_PREVIEW_KEY, ...sortedIds] : null, () =>
    previewOrgMerge(sortedIds),
  )
  return data
}
