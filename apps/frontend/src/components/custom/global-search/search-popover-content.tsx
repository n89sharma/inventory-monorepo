import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shadcn/tabs'
import { formatDate } from '@/lib/formatters'
import { CircleNotchIcon } from '@phosphor-icons/react'
import type { ArrivalSuggestion, BarcodeSuggestion, DepartureSuggestion, GlobalSearchResult } from 'shared-types'
import { CommandResultList } from './command-result-list'

export type FlatResult =
  | { kind: 'asset'; data: BarcodeSuggestion }
  | { kind: 'arrival'; data: ArrivalSuggestion }
  | { kind: 'departure'; data: DepartureSuggestion }

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
        <TabsTrigger value="assets" disabled={results.assets.length === 0}>Assets</TabsTrigger>
        <TabsTrigger value="arrivals" disabled={results.arrivals.length === 0}>Arrivals</TabsTrigger>
        <TabsTrigger value="departures" disabled={results.departures.length === 0}>Departures</TabsTrigger>
        <TabsTrigger value="transfers" disabled>Transfers</TabsTrigger>
        <TabsTrigger value="holds" disabled>Holds</TabsTrigger>
        <TabsTrigger value="invoices" disabled>Invoices</TabsTrigger>
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
      <TabsContent value="transfers" />
      <TabsContent value="holds" />
      <TabsContent value="invoices" />
    </Tabs>
  )
}
