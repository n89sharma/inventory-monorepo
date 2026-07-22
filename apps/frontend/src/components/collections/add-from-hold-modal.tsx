import { EntityLink } from '@/components/shared/entity-link'
import { HOLD_SEARCH_TYPES, useGlobalSearch } from '@/hooks/use-global-search'
import { useHoldMutations } from '@/hooks/use-hold-mutations'
import { formatDate } from '@/lib/formatters'
import { useState } from 'react'
import type { AssetSummary, HoldSuggestion } from 'shared-types'
import { toast } from 'sonner'
import { DetailGrid, SearchView } from './collection-search'
import { emptyResults, type CollectionResults } from './collection-search-types'
import { Button } from '../shadcn/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../shadcn/dialog'

function holdDetailFields(h: HoldSuggestion): { label: string; value: string | null }[] {
  return [
    { label: 'Customer', value: h.customer },
    { label: 'Date', value: formatDate(h.created_at) },
    { label: 'Created for', value: h.created_for },
    { label: 'Created by', value: h.created_by },
  ]
}

function HoldAssetsAddedMessage({
  added,
  skipped,
  holdNumber,
}: {
  added: number
  skipped: number
  holdNumber: string
}) {
  const assetNoun = `asset${added !== 1 ? 's' : ''}`
  if (skipped > 0) {
    return (
      <>
        {added} {assetNoun} added. {skipped} duplicate{skipped !== 1 ? 's' : ''} skipped.
      </>
    )
  }
  return (
    <>
      {added} {assetNoun} added from Hold <EntityLink entity="hold" id={holdNumber} />.
    </>
  )
}

function HoldSelectionStep({
  selected,
  onClear,
  query,
  onQueryChange,
  isLoading,
  results,
  onSelect,
}: {
  selected: HoldSuggestion | null
  onClear: () => void
  query: string
  onQueryChange: (value: string) => void
  isLoading: boolean
  results: CollectionResults
  onSelect: React.ComponentProps<typeof SearchView>['onSelect']
}) {
  if (selected !== null) {
    return (
      <DetailGrid
        title={`Hold ${selected.hold_number}`}
        fields={holdDetailFields(selected)}
        onClear={onClear}
      />
    )
  }
  return (
    <SearchView
      label="Hold"
      query={query}
      onQueryChange={onQueryChange}
      isLoading={isLoading}
      results={results}
      onSelect={onSelect}
    />
  )
}

interface AddFromHoldModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  getAssets: () => AssetSummary[]
  onAddAsset: (asset: AssetSummary) => void
  onCommitBatch?: (assets: AssetSummary[]) => Promise<void>
}

export function AddFromHoldModal({
  open,
  onOpenChange,
  getAssets,
  onAddAsset,
  onCommitBatch,
}: AddFromHoldModalProps) {
  const holdMutations = useHoldMutations()
  const [query, setQuery] = useState('')
  const { results: searchResults, isLoading } = useGlobalSearch(query, HOLD_SEARCH_TYPES)
  const [selected, setSelected] = useState<HoldSuggestion | null>(null)
  const [isConfirming, setIsConfirming] = useState(false)

  const results: CollectionResults = { ...emptyResults, holds: searchResults.holds }

  function handleQueryChange(value: string) {
    setQuery(value)
  }

  async function handleConfirm() {
    if (!selected) return
    setIsConfirming(true)
    try {
      const holdAssets = await holdMutations.getAssets(selected.hold_number)
      const currentIds = new Set(getAssets().map((a) => a.id))
      const toAdd = holdAssets.filter((a) => !currentIds.has(a.id))
      if (onCommitBatch) {
        if (toAdd.length > 0) await onCommitBatch(toAdd)
      } else {
        toAdd.forEach((asset) => onAddAsset(asset))
      }
      const skipped = holdAssets.length - toAdd.length
      toast.success(
        <HoldAssetsAddedMessage
          added={toAdd.length}
          skipped={skipped}
          holdNumber={selected.hold_number}
        />,
        { position: 'top-center' },
      )
      handleOpenChange(false)
    } catch {
      toast.error('Failed to load hold.', { position: 'top-center' })
      setIsConfirming(false)
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setQuery('')
      setSelected(null)
      setIsConfirming(false)
    }
    onOpenChange(nextOpen)
  }

  function handleClearSelection() {
    setSelected(null)
    setQuery('')
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Assets from Hold</DialogTitle>
        </DialogHeader>

        <HoldSelectionStep
          selected={selected}
          onClear={handleClearSelection}
          query={query}
          onQueryChange={handleQueryChange}
          isLoading={isLoading}
          results={results}
          onSelect={(c) => {
            if (c.kind === 'hold') setSelected(c.data)
          }}
        />

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={selected === null || isConfirming} onClick={handleConfirm}>
            {isConfirming ? 'Adding…' : 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
