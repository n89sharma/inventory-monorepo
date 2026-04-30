import type {
  DepartureSuggestion,
  HoldSuggestion,
  InvoiceSuggestion,
  TransferSuggestion,
} from 'shared-types'
import { Input } from '../shadcn/input'

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
  departures: [], transfers: [], holds: [], invoices: [],
}

function hasAnyResults(r: CollectionResults): boolean {
  return r.departures.length > 0 || r.transfers.length > 0 ||
    r.holds.length > 0 || r.invoices.length > 0
}

function ResultButton({ label, sub, onClick }: { label: string; sub: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
      onClick={onClick}
    >
      <span className="font-medium">{label}</span>
      <span className="ml-2 text-muted-foreground">{sub}</span>
    </button>
  )
}

function ResultsList({ results, onSelect }: { results: CollectionResults; onSelect: (c: SelectedCollection) => void }) {
  return (
    <div className="flex flex-col">
      {results.departures.map(d => (
        <ResultButton key={d.id} label={`Departure ${d.departure_number}`} sub={`${d.origin_code} → ${d.destination}`}
          onClick={() => onSelect({ kind: 'departure', data: d })} />
      ))}
      {results.transfers.map(t => (
        <ResultButton key={t.id} label={`Transfer ${t.transfer_number}`} sub={`${t.origin_code} → ${t.destination_code}`}
          onClick={() => onSelect({ kind: 'transfer', data: t })} />
      ))}
      {results.holds.map(h => (
        <ResultButton key={h.id} label={`Hold ${h.hold_number}`} sub={h.customer}
          onClick={() => onSelect({ kind: 'hold', data: h })} />
      ))}
      {results.invoices.map(i => (
        <ResultButton key={i.id} label={`Invoice ${i.invoice_number}`} sub={i.organization}
          onClick={() => onSelect({ kind: 'invoice', data: i })} />
      ))}
    </div>
  )
}

function SearchContent({ query, isLoading, results, onSelect }: {
  query: string
  isLoading: boolean
  results: CollectionResults
  onSelect: (c: SelectedCollection) => void
}) {
  if (!query) return <p className="px-3 py-2 text-sm text-muted-foreground">Start typing to search…</p>
  if (isLoading) return <p className="px-3 py-2 text-sm text-muted-foreground">Searching…</p>
  if (!hasAnyResults(results)) return <p className="px-3 py-2 text-sm text-muted-foreground">No results.</p>
  return <ResultsList results={results} onSelect={onSelect} />
}

export function SearchView({ query, onQueryChange, isLoading, results, onSelect }: {
  query: string
  onQueryChange: (v: string) => void
  isLoading: boolean
  results: CollectionResults
  onSelect: (c: SelectedCollection) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Collection</label>
        <Input
          autoFocus
          placeholder="Search by ID…"
          value={query}
          onChange={e => onQueryChange(e.target.value)}
        />
      </div>
      <div className="h-80 overflow-y-auto rounded-md border">
        <SearchContent query={query} isLoading={isLoading} results={results} onSelect={onSelect} />
      </div>
    </div>
  )
}
