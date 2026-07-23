import type {
  ArrivalSuggestion,
  DepartureSuggestion,
  HoldSuggestion,
  InvoiceSuggestion,
  TransferSuggestion,
} from 'shared-types'

export type SelectedCollection =
  | { kind: 'arrival'; data: ArrivalSuggestion }
  | { kind: 'departure'; data: DepartureSuggestion }
  | { kind: 'transfer'; data: TransferSuggestion }
  | { kind: 'hold'; data: HoldSuggestion }
  | { kind: 'invoice'; data: InvoiceSuggestion }

export type CollectionResults = {
  arrivals: ArrivalSuggestion[]
  departures: DepartureSuggestion[]
  transfers: TransferSuggestion[]
  holds: HoldSuggestion[]
  invoices: InvoiceSuggestion[]
}

export const emptyResults: CollectionResults = {
  arrivals: [],
  departures: [],
  transfers: [],
  holds: [],
  invoices: [],
}
