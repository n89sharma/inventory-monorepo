import { getGlobalSearchResults } from '@/data/api/search-api'
import { useArrivalMutations } from '@/hooks/use-arrival-mutations'
import { useEffect, useState } from 'react'
import type { ArrivalSuggestion, AssetSummary, SearchEntityType } from 'shared-types'
import { toast } from 'sonner'
import { DetailGrid, SearchView } from '../collections/collection-search'
import { emptyResults, type SelectedCollection } from '../collections/collection-search-types'
import { Button } from '../shadcn/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../shadcn/dialog'

const ARRIVAL_SEARCH_TYPES: SearchEntityType[] = ['arrivals']
const SEARCH_DEBOUNCE_MS = 150

interface DestinationStepProps {
  selected: ArrivalSuggestion | null
  query: string
  isLoading: boolean
  arrivals: ArrivalSuggestion[]
  onQueryChange: (value: string) => void
  onSelect: (collection: SelectedCollection) => void
  onClearSelection: () => void
}

function DestinationStep({
  selected,
  query,
  isLoading,
  arrivals,
  onQueryChange,
  onSelect,
  onClearSelection,
}: DestinationStepProps) {
  if (selected !== null) {
    return (
      <DetailGrid
        title={`Arrival ${selected.arrival_number}`}
        fields={[
          { label: 'Vendor', value: selected.vendor },
          { label: 'Warehouse', value: selected.warehouse_code },
        ]}
        onClear={onClearSelection}
      />
    )
  }
  return (
    <SearchView
      query={query}
      onQueryChange={onQueryChange}
      isLoading={isLoading}
      results={{ ...emptyResults, arrivals }}
      onSelect={onSelect}
      label="Destination arrival"
    />
  )
}

interface MoveToArrivalModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sourceArrivalNumber: string
  selectedAssets: AssetSummary[]
  onConfirmSuccess: () => void
}

export function MoveToArrivalModal({
  open,
  onOpenChange,
  sourceArrivalNumber,
  selectedAssets,
  onConfirmSuccess,
}: MoveToArrivalModalProps) {
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [arrivals, setArrivals] = useState<ArrivalSuggestion[]>([])
  const [selected, setSelected] = useState<ArrivalSuggestion | null>(null)
  const [isConfirming, setIsConfirming] = useState(false)

  const arrivalMutations = useArrivalMutations()
  const assetCount = selectedAssets.length
  const assetNoun = `asset${assetCount !== 1 ? 's' : ''}`

  useEffect(() => {
    if (!query) return
    const timer = setTimeout(async () => {
      const res = await getGlobalSearchResults(query, ARRIVAL_SEARCH_TYPES)
      setArrivals(res.arrivals.filter((a) => a.arrival_number !== sourceArrivalNumber))
      setIsLoading(false)
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [query, sourceArrivalNumber])

  function handleQueryChange(value: string) {
    setQuery(value)
    if (!value) {
      setArrivals([])
      setIsLoading(false)
      return
    }
    setIsLoading(true)
  }

  function handleSelect(collection: SelectedCollection) {
    if (collection.kind !== 'arrival') return
    setSelected(collection.data)
  }

  async function handleConfirm() {
    if (!selected) return
    setIsConfirming(true)
    try {
      await arrivalMutations.moveAssets(
        sourceArrivalNumber,
        selected.arrival_number,
        selectedAssets,
      )
      toast.success(`Moved ${assetCount} ${assetNoun} to Arrival ${selected.arrival_number}.`, {
        position: 'top-center',
      })
      onConfirmSuccess()
      handleOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to move assets', {
        position: 'top-center',
      })
      setIsConfirming(false)
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setQuery('')
      setArrivals([])
      setSelected(null)
      setIsLoading(false)
      setIsConfirming(false)
    }
    onOpenChange(nextOpen)
  }

  function handleClearSelection() {
    setSelected(null)
    setQuery('')
    setArrivals([])
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Move to arrival</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-1 rounded-md border px-3 py-2">
          <p>
            Move {assetCount} {assetNoun} from Arrival {sourceArrivalNumber}
          </p>
        </div>

        <DestinationStep
          selected={selected}
          query={query}
          isLoading={isLoading}
          arrivals={arrivals}
          onQueryChange={handleQueryChange}
          onSelect={handleSelect}
          onClearSelection={handleClearSelection}
        />

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={selected === null || isConfirming} onClick={handleConfirm}>
            {isConfirming ? 'Moving…' : 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
