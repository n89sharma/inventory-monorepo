import { Button } from '@/components/shadcn/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/shadcn/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/shadcn/dropdown-menu'
import { Input } from '@/components/shadcn/input'
import { Label } from '@/components/shadcn/label'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/shadcn/tooltip'
import { useSavedViews } from '@/hooks/use-saved-view'
import { useSavedViewMutations } from '@/hooks/use-saved-view-mutations'
import { BookmarksIcon, PlusIcon, TrashIcon } from '@phosphor-icons/react'
import { useOptimisticSearchParams } from 'nuqs/adapters/react-router/v7'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { SavedViewPageKey, SavedViewSummary } from 'shared-types'
import { toast } from 'sonner'

const TOAST_POSITION = { position: 'top-center' } as const
const EMPTY_VIEWS: SavedViewSummary[] = []

function SavedViewRow({
  view,
  onApply,
  onDelete,
}: {
  view: SavedViewSummary
  onApply: (view: SavedViewSummary) => void
  onDelete: (view: SavedViewSummary) => void
}): React.JSX.Element {
  return (
    <DropdownMenuItem onSelect={() => onApply(view)} className="justify-between gap-2">
      <span className="truncate">{view.name}</span>
      <Button
        variant="ghost"
        size="icon-xs"
        className="shrink-0 text-muted-foreground hover:text-destructive"
        aria-label={`Delete ${view.name}`}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          onDelete(view)
        }}
      >
        <TrashIcon />
      </Button>
    </DropdownMenuItem>
  )
}

function SaveViewDialog({
  open,
  onOpenChange,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (name: string) => Promise<void>
}): React.JSX.Element {
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const trimmed = name.trim()
    if (trimmed === '') return
    setSaving(true)
    try {
      await onSave(trimmed)
      setName('')
      onOpenChange(false)
    } catch {
      // failure already surfaced by the axios interceptor toast
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Save as new view</DialogTitle>
            <DialogDescription>Name this filter configuration to reuse it later.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-4">
            <Label htmlFor="saved-view-name">View name</Label>
            <Input
              id="saved-view-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Toronto in-stock copiers"
              maxLength={100}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || name.trim() === ''}>
              Save view
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function SavedViewsButton({
  pageKey,
  visibleColumns,
  onApplyColumns,
}: {
  pageKey: SavedViewPageKey
  visibleColumns?: Set<string>
  onApplyColumns?: (columnIds: readonly string[]) => void
}): React.JSX.Element {
  const [, setSearchParams] = useSearchParams()
  const liveSearchParams = useOptimisticSearchParams()
  const { data: views = EMPTY_VIEWS } = useSavedViews(pageKey)
  const { create, remove } = useSavedViewMutations()
  const [dialogOpen, setDialogOpen] = useState(false)

  function applyView(view: SavedViewSummary) {
    setSearchParams(new URLSearchParams(view.query_string), { replace: true })
    onApplyColumns?.(view.column_ids)
  }

  async function saveView(name: string) {
    await create({
      name,
      page_key: pageKey,
      query_string: liveSearchParams.toString(),
      column_ids: visibleColumns ? [...visibleColumns] : [],
    })
    toast.success(`Saved view "${name}"`, TOAST_POSITION)
  }

  async function deleteView(view: SavedViewSummary) {
    try {
      await remove(pageKey, view.id)
      toast.success(`Deleted view "${view.name}"`, TOAST_POSITION)
    } catch {
      // failure already surfaced by the axios interceptor toast
    }
  }

  return (
    <>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Saved views">
                <BookmarksIcon />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>Saved views</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end" className="w-64">
          {views.length === 0 ? (
            <DropdownMenuLabel className="font-normal text-muted-foreground">
              No saved views yet
            </DropdownMenuLabel>
          ) : (
            views.map((view) => (
              <SavedViewRow key={view.id} view={view} onApply={applyView} onDelete={deleteView} />
            ))
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setDialogOpen(true)}>
            <PlusIcon />
            Save as new view
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <SaveViewDialog open={dialogOpen} onOpenChange={setDialogOpen} onSave={saveView} />
    </>
  )
}
