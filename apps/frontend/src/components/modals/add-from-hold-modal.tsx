import { getHoldDetail } from '@/data/api/hold-api'
import { formatDate } from '@/lib/formatters'
import { useState } from 'react'
import { toast } from 'sonner'
import type { AssetSummary, HoldSuggestion } from 'shared-types'
import { Button } from '../shadcn/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../shadcn/dialog'
import { DetailGrid, emptyResults, SearchView, type CollectionResults } from './collection-search'

function holdDetailFields(h: HoldSuggestion): { label: string; value: string | null }[] {
  return [
    { label: 'Customer',    value: h.customer },
    { label: 'Date',        value: formatDate(h.created_at) },
    { label: 'Created for', value: h.created_for },
    { label: 'Created by',  value: h.created_by },
  ]
}

interface AddFromHoldModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  getAssets: () => AssetSummary[]
  onAddAsset: (asset: AssetSummary) => void
}

export function AddFromHoldModal({ open, onOpenChange, getAssets, onAddAsset }: AddFromHoldModalProps) {
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<CollectionResults>(emptyResults)
  const [selected, setSelected] = useState<HoldSuggestion | null>(null)
  const [isConfirming, setIsConfirming] = useState(false)

  function handleQueryChange(value: string) {
    setQuery(value)
    if (!value) {
      setResults(emptyResults)
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    const t = setTimeout(async () => {
      try {
        const { getGlobalSearchResults } = await import('@/data/api/search-api')
        const res = await getGlobalSearchResults(value)
        setResults({ ...emptyResults, holds: res.holds })
      } finally {
        setIsLoading(false)
      }
    }, 150)
    return () => clearTimeout(t)
  }

  async function handleConfirm() {
    if (!selected) return
    setIsConfirming(true)
    try {
      const hold = await getHoldDetail(selected.hold_number)
      const currentIds = new Set(getAssets().map(a => a.id))
      const toAdd = hold.assets.filter(a => !currentIds.has(a.id))
      toAdd.forEach(asset => onAddAsset(asset))
      const skipped = hold.assets.length - toAdd.length
      const msg = skipped > 0
        ? `${toAdd.length} asset${toAdd.length !== 1 ? 's' : ''} added. ${skipped} duplicate${skipped !== 1 ? 's' : ''} skipped.`
        : `${toAdd.length} asset${toAdd.length !== 1 ? 's' : ''} added from Hold ${selected.hold_number}.`
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
      setResults(emptyResults)
      setSelected(null)
      setIsLoading(false)
      setIsConfirming(false)
    }
    onOpenChange(nextOpen)
  }

  function handleClearSelection() {
    setSelected(null)
    setQuery('')
    setResults(emptyResults)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Assets from Hold</DialogTitle>
        </DialogHeader>

        {selected !== null
          ? <DetailGrid
              title={`Hold ${selected.hold_number}`}
              fields={holdDetailFields(selected)}
              onClear={handleClearSelection}
            />
          : <SearchView
              label="Hold"
              query={query}
              onQueryChange={handleQueryChange}
              isLoading={isLoading}
              results={results}
              onSelect={c => { if (c.kind === 'hold') setSelected(c.data) }}
            />
        }

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
          <Button disabled={selected === null || isConfirming} onClick={handleConfirm}>
            {isConfirming ? 'Adding…' : 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
