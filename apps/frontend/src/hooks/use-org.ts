import { getOrgs } from '@/data/api/org-api'
import { CATALOG_DATA_OPTIONS } from '@/lib/swr-options'
import type { OrgDetail } from 'shared-types'
import useSWR, { mutate } from 'swr'

const ORGS_KEY = 'orgs'
const EMPTY_ORGS: OrgDetail[] = []

export function useOrgs(): OrgDetail[] {
  const { data } = useSWR(ORGS_KEY, getOrgs, CATALOG_DATA_OPTIONS)
  return data ?? EMPTY_ORGS
}

export function invalidateOrgs() {
  return mutate(ORGS_KEY)
}
