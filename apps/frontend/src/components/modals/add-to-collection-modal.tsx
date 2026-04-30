import { addAssetsToCollection, getCollectionAssets, type CollectionTarget } from '@/data/api/add-to-collection-api'
import { formatDate } from '@/lib/formatters'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { AssetSummary } from 'shared-types'
import { Button } from '../shadcn/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../shadcn/dialog'
import { emptyResults, SearchView, type CollectionResults, type SelectedCollection } from './collection-search'

function toCollectionTarget(s: SelectedCollection): CollectionTarget {
  switch (s.kind) {
    case 'departure': return { kind: 'departure', number: s.data.departure_number }
    case 'transfer':  return { kind: 'transfer',  number: s.data.transfer_number }
    case 'hold':      return { kind: 'hold',       number: s.data.hold_number }
    case 'invoice':   return { kind: 'invoice',    number: s.data.invoice_number }
  }
}

function collectionLabel(s: SelectedCollection): string {
  switch (s.kind) {
    case 'departure': return `Departure ${s.data.departure_number}`
    case 'transfer':  return `Transfer ${s.data.transfer_number}`
    case 'hold':      return `Hold ${s.data.hold_number}`
    case 'invoice':   return `Invoice ${s.data.invoice_number}`
  }
}

function getDetailFields(s: SelectedCollection): { label: string; value: string | null }[] {
  switch (s.kind) {
    case 'departure':
      return [
        { label: 'Origin',      value: s.data.origin_code },
        { label: 'Destination', value: s.data.destination },
        { label: 'Transporter', value: null },
        { label: 'Date',        value: formatDate(s.data.created_at) },
      ]
    case 'transfer':
      return [
        { label: 'Origin',      value: s.data.origin_code },
        { label: 'Destination', value: s.data.destination_code },
        { label: 'Transporter', value: null },
        { label: 'Date',        value: formatDate(s.data.created_at) },
      ]
    case 'hold':
      return [
        { label: 'Created for', value: s.data.created_for },
        { label: 'Customer',    value: s.data.customer },
        { label: 'From',        value: null },
        { label: 'To',          value: null },
      ]
    case 'invoice':
      return [
        { label: 'Organization', value: s.data.organization },
        { label: 'Invoice type', value: s.data.invoice_type },
        { label: 'Cleared',      value: null },
        { label: 'Date',         value: formatDate(s.data.created_at) },
      ]
  }
}

function InformationSection({ assetCount, selected, duplicateCount, isLoadingDetail }: {
  assetCount: number
  selected: SelectedCollection | null
  duplicateCount: number
  isLoadingDetail: boolean
}) {
  const target = selected !== null ? ` ${collectionLabel(selected)}` : ':'

  let secondLine: React.ReactNode = null
  if (selected !== null) {
    if (isLoadingDetail) {
      secondLine = <p className="text-sm text-muted-foreground">Checking for duplicates…</p>
    } else if (duplicateCount > 0) {
      secondLine = <p className="text-sm text-amber-600">Found {duplicateCount} duplicate{duplicateCount !== 1 ? 's' : ''}. Duplicates will be skipped</p>
    }
  }

  return (
    <div className="flex flex-col gap-1 rounded-md border px-3 py-2">
      <p className="text-sm">
        Add {assetCount} asset{assetCount !== 1 ? 's' : ''} to{target}
      </p>
      {secondLine}
    </div>
  )
}

function DetailGrid({ selected, onClear }: { selected: SelectedCollection; onClear: () => void }) {
  return (
    <div className="flex flex-col gap-3 rounded-md border p-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium px-1">{collectionLabel(selected)}</p>
        <Button variant="secondary" size="sm" onClick={onClear}>Change</Button>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-3 px-1 text-sm">
        {getDetailFields(selected).map(({ label, value }) => (
          <div key={label}>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="font-medium">{value ?? '—'}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

interface AddToCollectionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedAssets: AssetSummary[]
  onConfirmSuccess: () => void
}

export function AddToCollectionModal({ open, onOpenChange, selectedAssets, onConfirmSuccess }: AddToCollectionModalProps) {
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<CollectionResults>(emptyResults)
  const [selected, setSelected] = useState<SelectedCollection | null>(null)
  const [duplicateCount, setDuplicateCount] = useState(0)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)

  const assetCount = selectedAssets.length

  useEffect(() => {
    if (!query) return
    const t = setTimeout(async () => {
      const { getGlobalSearchResults } = await import('@/data/api/search-api')
      const res = await getGlobalSearchResults(query)
      setResults({ departures: res.departures, transfers: res.transfers, holds: res.holds, invoices: res.invoices })
      setIsLoading(false)
    }, 150)
    return () => clearTimeout(t)
  }, [query])

  function handleQueryChange(value: string) {
    setQuery(value)
    if (!value) {
      setResults(emptyResults)
      setIsLoading(false)
      return
    }
    setIsLoading(true)
  }

  async function handleSelect(collection: SelectedCollection) {
    setSelected(collection)
    setDuplicateCount(0)
    setIsLoadingDetail(true)
    try {
      const existing = await getCollectionAssets(toCollectionTarget(collection))
      const existingIds = new Set(existing.map(a => a.id))
      setDuplicateCount(selectedAssets.filter(a => existingIds.has(a.id)).length)
    } catch {
      toast.error('Failed to load collection details', { position: 'top-center' })
      setSelected(null)
    } finally {
      setIsLoadingDetail(false)
    }
  }

  async function handleConfirm() {
    if (!selected) return
    setIsConfirming(true)
    try {
      const { added, skipped } = await addAssetsToCollection(toCollectionTarget(selected), selectedAssets)
      const msg = skipped > 0
        ? `${added} asset${added !== 1 ? 's' : ''} added. ${skipped} already present and skipped.`
        : `${added} asset${added !== 1 ? 's' : ''} added to ${collectionLabel(selected)}.`
      toast.success(msg, { position: 'top-center' })
      onConfirmSuccess()
      handleOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add assets', { position: 'top-center' })
      setIsConfirming(false)
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setQuery('')
      setResults(emptyResults)
      setSelected(null)
      setIsLoading(false)
      setDuplicateCount(0)
      setIsLoadingDetail(false)
      setIsConfirming(false)
    }
    onOpenChange(nextOpen)
  }

  function handleClearSelection() {
    setSelected(null)
    setDuplicateCount(0)
    setIsLoadingDetail(false)
    setQuery('')
    setResults(emptyResults)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add to Collection</DialogTitle>
        </DialogHeader>

        <InformationSection assetCount={assetCount} selected={selected} duplicateCount={duplicateCount} isLoadingDetail={isLoadingDetail} />

        {selected !== null
          ? <DetailGrid selected={selected} onClear={handleClearSelection} />
          : <SearchView query={query} onQueryChange={handleQueryChange} isLoading={isLoading} results={results} onSelect={handleSelect} />
        }

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
          <Button disabled={selected === null || isLoadingDetail || isConfirming} onClick={handleConfirm}>
            {isConfirming ? 'Adding…' : 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
