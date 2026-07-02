import type {
  DepartureSuggestion,
  HoldSuggestion,
  InvoiceSuggestion,
  TransferSuggestion,
} from 'shared-types'

export type SelectedCollection =
  | { kind: 'departure'; data: DepartureSuggestion }
  | { kind: 'transfer'; data: TransferSuggestion }
  | { kind: 'hold'; data: HoldSuggestion }
  | { kind: 'invoice'; data: InvoiceSuggestion }

export type CollectionResults = {
  departures: DepartureSuggestion[]
  transfers: TransferSuggestion[]
  holds: HoldSuggestion[]
  invoices: InvoiceSuggestion[]
}

export const emptyResults: CollectionResults = {
  departures: [],
  transfers: [],
  holds: [],
  invoices: [],
}
