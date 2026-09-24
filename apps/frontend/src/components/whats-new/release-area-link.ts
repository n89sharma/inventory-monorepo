import { useDefaultAssetType } from '@/hooks/use-default-asset-type'
import { useProfileDefaultWarehouse } from '@/hooks/use-profile-default-warehouse'
import {
  buildAssetSearchPath,
  buildCollectionSummaryPath,
  buildDepartedSearchPath,
  buildStoreListPath,
} from '@/lib/filters/serializers'
import type { ReleaseLinkArea } from 'shared-types'

const ON_HAND_PATH = '/search/onhand'
const IN_STOCK_SUMMARY_PATH = '/reports/in-stock-summary'
const SETTINGS_PATH = '/settings/models'

export const RELEASE_AREA_LABELS = {
  arrivals: 'Arrivals',
  holds: 'Holds',
  transfers: 'Transfers',
  departures: 'Departures',
  invoices: 'Invoices',
  store: 'Store',
  onhand_assets: 'On-Hand Assets',
  departed_assets: 'Departed Assets',
  reports: 'Reports',
  settings: 'Settings',
} as const satisfies Record<ReleaseLinkArea, string>

// Mirrors the sidebar: a destination carries the same default filters a nav link would,
// so a note's link lands on a populated page rather than an empty one.
export function useReleaseAreaHrefs(): Record<ReleaseLinkArea, string> {
  const defaultWarehouse = useProfileDefaultWarehouse()
  const defaultAssetType = useDefaultAssetType()

  return {
    arrivals: buildCollectionSummaryPath('/arrivals'),
    holds: buildCollectionSummaryPath('/holds'),
    transfers: buildCollectionSummaryPath('/transfers'),
    departures: buildCollectionSummaryPath('/departures'),
    invoices: buildCollectionSummaryPath('/invoices'),
    store: buildStoreListPath(defaultWarehouse),
    onhand_assets: buildAssetSearchPath(ON_HAND_PATH, defaultWarehouse, defaultAssetType),
    departed_assets: buildDepartedSearchPath(defaultWarehouse, defaultAssetType),
    reports: IN_STOCK_SUMMARY_PATH,
    settings: SETTINGS_PATH,
  }
}
