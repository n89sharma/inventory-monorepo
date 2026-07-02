import { EntityLink } from '@/components/shared/entity-link'
import { getGlobalSearchResults } from '@/data/api/search-api'
import { useCan } from '@/hooks/use-can'
import { useDepartureMutations } from '@/hooks/use-departure-mutations'
import { useHoldMutations } from '@/hooks/use-hold-mutations'
import { useInvoiceMutations } from '@/hooks/use-invoice-mutations'
import { useTransferMutations } from '@/hooks/use-transfer-mutations'
import { ENTITY_CONFIG, type LinkableEntity } from '@/lib/entity-config'
import { formatDate } from '@/lib/formatters'
import { useEffect, useState } from 'react'
import type { AssetSummary } from 'shared-types'
import { toast } from 'sonner'
import { mutate } from 'swr'
import { DetailGrid, SearchView } from './collection-search'
import {
  emptyResults,
  type CollectionResults,
  type SelectedCollection,
} from './collection-search-types'
import { Button } from '../shadcn/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../shadcn/dialog'

function collectionLabel(s: SelectedCollection): string {
  const { entity, id } = collectionRef(s)
  return `${ENTITY_CONFIG[entity].label} ${id}`
}

function collectionRef(s: SelectedCollection): { entity: LinkableEntity; id: string } {
  switch (s.kind) {
    case 'departure':
      return { entity: 'departure', id: s.data.departure_number }
    case 'transfer':
      return { entity: 'transfer', id: s.data.transfer_number }
    case 'hold':
      return { entity: 'hold', id: s.data.hold_number }
    case 'invoice':
      return { entity: 'invoice', id: s.data.invoice_number }
  }
}

function getDetailFields(s: SelectedCollection): { label: string; value: string | null }[] {
  switch (s.kind) {
    case 'departure':
      return [
        { label: 'Origin', value: s.data.origin_code },
        { label: 'Destination', value: s.data.destination },
        { label: 'Transporter', value: null },
        { label: 'Date', value: formatDate(s.data.created_at) },
      ]
    case 'transfer':
      return [
        { label: 'Origin', value: s.data.origin_code },
        { label: 'Destination', value: s.data.destination_code },
        { label: 'Transporter', value: null },
        { label: 'Date', value: formatDate(s.data.created_at) },
      ]
    case 'hold':
      return [
        { label: 'Created for', value: s.data.created_for },
        { label: 'Customer', value: s.data.customer },
        { label: 'From', value: null },
        { label: 'To', value: null },
      ]
    case 'invoice':
      return [
        { label: 'Organization', value: s.data.organization },
        { label: 'Invoice type', value: s.data.invoice_type },
        { label: 'Cleared', value: null },
        { label: 'Date', value: formatDate(s.data.created_at) },
      ]
  }
}

function InformationSection({
  assetCount,
  selected,
  duplicateCount,
  isLoadingDetail,
}: {
  assetCount: number
  selected: SelectedCollection | null
  duplicateCount: number
  isLoadingDetail: boolean
}) {
  const target = selected !== null ? ` ${collectionLabel(selected)}` : ':'

  let secondLine: React.ReactNode = null
  if (selected !== null) {
    if (isLoadingDetail) {
      secondLine = <p className="text-muted-foreground">Checking for duplicates…</p>
    } else if (duplicateCount > 0) {
      secondLine = (
        <p className="text-amber-600">
          Found {duplicateCount} duplicate{duplicateCount !== 1 ? 's' : ''}. Duplicates will be
          skipped
        </p>
      )
    }
  }

  return (
    <div className="flex flex-col gap-1 rounded-md border px-3 py-2">
      <p>
        Add {assetCount} asset{assetCount !== 1 ? 's' : ''} to{target}
      </p>
      {secondLine}
    </div>
  )
}

interface AddToCollectionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedAssets: AssetSummary[]
  onConfirmSuccess: () => void
  refreshKey?: string
}

export function AddToCollectionModal({
  open,
  onOpenChange,
  selectedAssets,
  onConfirmSuccess,
  refreshKey,
}: AddToCollectionModalProps) {
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<CollectionResults>(emptyResults)
  const [selected, setSelected] = useState<SelectedCollection | null>(null)
  const [duplicateCount, setDuplicateCount] = useState(0)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)

  const canCreateTransfer = useCan('create_update_transfer')
  const canCreateDeparture = useCan('create_update_departure')
  const canCreateHold = useCan('create_update_hold')
  const canCreateInvoice = useCan('create_update_invoice')

  const holdMutations = useHoldMutations()
  const departureMutations = useDepartureMutations()
  const transferMutations = useTransferMutations()
  const invoiceMutations = useInvoiceMutations()

  const assetCount = selectedAssets.length

  useEffect(() => {
    if (!query) return
    const t = setTimeout(async () => {
      const res = await getGlobalSearchResults(query)
      setResults({
        departures: canCreateDeparture ? res.departures : [],
        transfers: canCreateTransfer ? res.transfers : [],
        holds: canCreateHold ? res.holds : [],
        invoices: canCreateInvoice ? res.invoices : [],
      })
      setIsLoading(false)
    }, 150)
    return () => clearTimeout(t)
  }, [query, canCreateDeparture, canCreateTransfer, canCreateHold, canCreateInvoice])

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
      let existing: AssetSummary[]
      switch (collection.kind) {
        case 'hold':
          existing = await holdMutations.getAssets(collection.data.hold_number)
          break
        case 'departure':
          existing = await departureMutations.getAssets(collection.data.departure_number)
          break
        case 'transfer':
          existing = await transferMutations.getAssets(collection.data.transfer_number)
          break
        case 'invoice':
          existing = await invoiceMutations.getAssets(collection.data.invoice_number)
          break
      }
      const existingIds = new Set(existing.map((a) => a.id))
      setDuplicateCount(selectedAssets.filter((a) => existingIds.has(a.id)).length)
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
      let added: number
      let skipped: number
      switch (selected.kind) {
        case 'hold': {
          ;({ added, skipped } = await holdMutations.addAssets(
            selected.data.hold_number,
            selectedAssets,
          ))
          break
        }
        case 'departure': {
          ;({ added, skipped } = await departureMutations.addAssets(
            selected.data.departure_number,
            selectedAssets,
          ))
          break
        }
        case 'transfer': {
          ;({ added, skipped } = await transferMutations.addAssets(
            selected.data.transfer_number,
            selectedAssets,
          ))
          break
        }
        case 'invoice': {
          ;({ added, skipped } = await invoiceMutations.addAssets(
            selected.data.invoice_number,
            selectedAssets,
          ))
          break
        }
      }
      const assetNoun = `asset${added! !== 1 ? 's' : ''}`
      const ref = collectionRef(selected)
      const msg =
        skipped > 0 ? (
          <>
            {added!} {assetNoun} added. {skipped} already present and skipped.
          </>
        ) : (
          <>
            {added!} {assetNoun} added to {ENTITY_CONFIG[ref.entity].label}{' '}
            <EntityLink entity={ref.entity} id={ref.id} />.
          </>
        )
      toast.success(msg, { position: 'top-center' })
      if (refreshKey) mutate(refreshKey)
      onConfirmSuccess()
      handleOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add assets', {
        position: 'top-center',
      })
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

        <InformationSection
          assetCount={assetCount}
          selected={selected}
          duplicateCount={duplicateCount}
          isLoadingDetail={isLoadingDetail}
        />

        {selected !== null ? (
          <DetailGrid
            title={collectionLabel(selected)}
            fields={getDetailFields(selected)}
            onClear={handleClearSelection}
          />
        ) : (
          <SearchView
            query={query}
            onQueryChange={handleQueryChange}
            isLoading={isLoading}
            results={results}
            onSelect={handleSelect}
          />
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={selected === null || isLoadingDetail || isConfirming}
            onClick={handleConfirm}
          >
            {isConfirming ? 'Adding…' : 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
