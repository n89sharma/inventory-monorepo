import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shadcn/tabs'
import { formatDate } from '@/lib/formatters'
import { CircleNotchIcon } from '@phosphor-icons/react'
import type { ArrivalSuggestion, BarcodeSuggestion, DepartureSuggestion, GlobalSearchResult, HoldSuggestion, InvoiceSuggestion, TransferSuggestion } from 'shared-types'
import { CommandResultList } from './command-result-list'

export type FlatResult =
  | { kind: 'asset'; data: BarcodeSuggestion }
  | { kind: 'arrival'; data: ArrivalSuggestion }
  | { kind: 'departure'; data: DepartureSuggestion }
  | { kind: 'transfer'; data: TransferSuggestion }
  | { kind: 'hold'; data: HoldSuggestion }
  | { kind: 'invoice'; data: InvoiceSuggestion }

type Props = {
  isLoading: boolean
  hasResults: boolean
  results: GlobalSearchResult
  activeTab: string
  onTabChange: (tab: string) => void
  onSelect: (item: FlatResult) => void
  onHover: (barcode: string) => void
}

export function SearchPopoverContent({ isLoading, hasResults, results, activeTab, onTabChange, onSelect, onHover }: Props) {
  if (isLoading) return (
    <div className="flex justify-center py-6">
      <CircleNotchIcon className="animate-spin" size={16} />
    </div>
  )

  if (!hasResults) return (
    <p className="py-6 text-center text-sm text-muted-foreground">No results</p>
  )

  return (
    <Tabs value={activeTab} onValueChange={onTabChange}>
      <TabsList className="w-full" variant="line">
        <TabsTrigger value="assets" disabled={results.assets.length === 0} className="cursor-pointer">Assets</TabsTrigger>
        <TabsTrigger value="arrivals" disabled={results.arrivals.length === 0} className="cursor-pointer">Arrivals</TabsTrigger>
        <TabsTrigger value="departures" disabled={results.departures.length === 0} className="cursor-pointer">Departures</TabsTrigger>
        <TabsTrigger value="transfers" disabled={results.transfers.length === 0} className="cursor-pointer">Transfers</TabsTrigger>
        <TabsTrigger value="holds" disabled={results.holds.length === 0} className="cursor-pointer">Holds</TabsTrigger>
        <TabsTrigger value="invoices" disabled={results.invoices.length === 0} className="cursor-pointer">Invoices</TabsTrigger>
      </TabsList>
      <TabsContent value="assets">
        <CommandResultList
          items={results.assets}
          getKey={s => s.barcode}
          getValue={s => s.barcode}
          getColumns={s => [s.barcode, s.serial_number, s.asset_type, s.model]}
          onSelect={s => onSelect({ kind: 'asset', data: s })}
          onHover={onHover}
        />
      </TabsContent>
      <TabsContent value="arrivals">
        <CommandResultList
          items={results.arrivals}
          getKey={s => String(s.id)}
          getValue={s => s.arrival_number}
          getColumns={s => [s.arrival_number, formatDate(s.created_at), s.warehouse_code, s.vendor]}
          onSelect={s => onSelect({ kind: 'arrival', data: s })}
        />
      </TabsContent>
      <TabsContent value="departures">
        <CommandResultList
          items={results.departures}
          getKey={s => String(s.id)}
          getValue={s => s.departure_number}
          getColumns={s => [s.departure_number, formatDate(s.created_at), s.origin_code, s.destination]}
          onSelect={s => onSelect({ kind: 'departure', data: s })}
        />
      </TabsContent>
      <TabsContent value="transfers">
        <CommandResultList
          items={results.transfers}
          getKey={s => String(s.id)}
          getValue={s => s.transfer_number}
          getColumns={s => [s.transfer_number, formatDate(s.created_at), s.origin_code, s.destination_code]}
          onSelect={s => onSelect({ kind: 'transfer', data: s })}
        />
      </TabsContent>
      <TabsContent value="holds">
        <CommandResultList
          items={results.holds}
          getKey={s => String(s.id)}
          getValue={s => s.hold_number}
          getColumns={s => [s.hold_number, formatDate(s.created_at), s.customer, s.created_for]}
          onSelect={s => onSelect({ kind: 'hold', data: s })}
        />
      </TabsContent>
      <TabsContent value="invoices">
        <CommandResultList
          items={results.invoices}
          getKey={s => String(s.id)}
          getValue={s => s.invoice_number}
          getColumns={s => [s.invoice_number, formatDate(s.created_at), s.organization, s.invoice_type]}
          onSelect={s => onSelect({ kind: 'invoice', data: s })}
        />
      </TabsContent>
    </Tabs>
  )
}
