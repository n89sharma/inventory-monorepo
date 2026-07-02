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
      const assetNoun = `asset${toAdd.length !== 1 ? 's' : ''}`
      const msg =
        skipped > 0 ? (
          <>
            {toAdd.length} {assetNoun} added. {skipped} duplicate{skipped !== 1 ? 's' : ''} skipped.
          </>
        ) : (
          <>
            {toAdd.length} {assetNoun} added from Hold{' '}
            <EntityLink entity="hold" id={selected.hold_number} />.
          </>
        )
      toast.success(msg, { position: 'top-center' })
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

        {selected !== null ? (
          <DetailGrid
            title={`Hold ${selected.hold_number}`}
            fields={holdDetailFields(selected)}
            onClear={handleClearSelection}
          />
        ) : (
          <SearchView
            label="Hold"
            query={query}
            onQueryChange={handleQueryChange}
            isLoading={isLoading}
            results={results}
            onSelect={(c) => {
              if (c.kind === 'hold') setSelected(c.data)
            }}
          />
        )}

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
