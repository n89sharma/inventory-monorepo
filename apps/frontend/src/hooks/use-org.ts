import { getOrgs } from '@/data/api/org-api'
import { CATALOG_DATA_OPTIONS } from '@/lib/swr-options'
import type { OrgSummary } from 'shared-types'
import useSWR, { mutate } from 'swr'

const ORGS_KEY = 'orgs'
const EMPTY_ORGS: OrgSummary[] = []

export function useOrgs(): OrgSummary[] {
  const { data } = useSWR(ORGS_KEY, getOrgs, CATALOG_DATA_OPTIONS)
  return data ?? EMPTY_ORGS
}

export function invalidateOrgs() {
  return mutate(ORGS_KEY)
}
