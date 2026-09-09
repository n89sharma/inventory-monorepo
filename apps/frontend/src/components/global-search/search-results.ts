import { formatDate } from '@/lib/formatters'
import type {
  ArrivalSuggestion,
  BarcodeSuggestion,
  DepartureSuggestion,
  GlobalSearchResult,
  HoldSuggestion,
  InvoiceSuggestion,
  SearchEntityType,
  TransferSuggestion,
} from 'shared-types'

export type FlatResult =
  | { kind: 'asset'; data: BarcodeSuggestion }
  | { kind: 'arrival'; data: ArrivalSuggestion }
  | { kind: 'departure'; data: DepartureSuggestion }
  | { kind: 'transfer'; data: TransferSuggestion }
  | { kind: 'hold'; data: HoldSuggestion }
  | { kind: 'invoice'; data: InvoiceSuggestion }

export type SearchResultTab = {
  type: SearchEntityType
  label: string
  items: FlatResult[]
}

type SearchResultTabDefinition = {
  type: SearchEntityType
  label: string
  getItems: (results: GlobalSearchResult) => FlatResult[]
}

const SEARCH_RESULT_TAB_DEFINITIONS: readonly SearchResultTabDefinition[] = [
  {
    type: 'assets',
    label: 'Assets',
    getItems: (results) => results.assets.map((data) => ({ kind: 'asset', data })),
  },
  {
    type: 'arrivals',
    label: 'Arrivals',
    getItems: (results) => results.arrivals.map((data) => ({ kind: 'arrival', data })),
  },
  {
    type: 'departures',
    label: 'Departures',
    getItems: (results) => results.departures.map((data) => ({ kind: 'departure', data })),
  },
  {
    type: 'transfers',
    label: 'Transfers',
    getItems: (results) => results.transfers.map((data) => ({ kind: 'transfer', data })),
  },
  {
    type: 'holds',
    label: 'Holds',
    getItems: (results) => results.holds.map((data) => ({ kind: 'hold', data })),
  },
  {
    type: 'invoices',
    label: 'Invoices',
    getItems: (results) => results.invoices.map((data) => ({ kind: 'invoice', data })),
  },
]

export function buildSearchResultTabs(
  results: GlobalSearchResult,
  eligibleTypes: readonly SearchEntityType[],
): SearchResultTab[] {
  return SEARCH_RESULT_TAB_DEFINITIONS.filter((definition) =>
    eligibleTypes.includes(definition.type),
  ).map((definition) => ({
    type: definition.type,
    label: definition.label,
    items: definition.getItems(results),
  }))
}

export function resultOptionId(listboxId: string, index: number): string {
  return `${listboxId}-option-${index}`
}

export function getActiveTabItems(tabs: SearchResultTab[], activeTab: string): FlatResult[] {
  return tabs.find((tab) => tab.type === activeTab)?.items ?? []
}

export function getSearchResultKey(result: FlatResult): string {
  if (result.kind === 'asset') return result.data.barcode
  return String(result.data.id)
}

export function getSearchResultColumns(result: FlatResult): string[] {
  switch (result.kind) {
    case 'asset':
      return [
        result.data.barcode,
        result.data.serial_number,
        result.data.asset_type,
        result.data.model,
      ]
    case 'arrival':
      return [
        result.data.arrival_number,
        formatDate(result.data.created_at),
        result.data.warehouse_code,
        result.data.vendor,
      ]
    case 'departure':
      return [
        result.data.departure_number,
        formatDate(result.data.created_at),
        result.data.origin_code,
        result.data.destination,
      ]
    case 'transfer':
      return [
        result.data.transfer_number,
        formatDate(result.data.created_at),
        result.data.origin_code,
        result.data.destination_code,
      ]
    case 'hold':
      return [
        result.data.hold_number,
        formatDate(result.data.created_at),
        result.data.customer,
        result.data.created_for,
      ]
    case 'invoice':
      return [
        result.data.invoice_reference,
        result.data.invoice_number,
        formatDate(result.data.created_at),
        result.data.organization,
        result.data.invoice_type,
      ]
  }
}
