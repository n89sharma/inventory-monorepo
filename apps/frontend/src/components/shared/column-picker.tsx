import { Button } from '@/components/shadcn/button'
import { Input } from '@/components/shadcn/input'
import { Label } from '@/components/shadcn/label'
import { Switch } from '@/components/shadcn/switch'
import {
  COLUMN_SECTIONS,
  type AssetSearchColumn,
} from '@/components/table-columns/asset-search-columns'
import { cn } from '@/lib/utils'
import { MagnifyingGlassIcon } from '@phosphor-icons/react'
import { useId, useMemo, useState } from 'react'

const SEARCH_PLACEHOLDER = 'Search columns'
const EMPTY_RESULT_TEXT = 'No columns match'
const RESET_LABEL = 'Reset to defaults'
const ALL_TOGGLE_LABEL = 'All'
// Grows with the viewport but never past it: the popover's own available height, less the
// search bar and reset footer that sit outside this scroll area.
const SCROLL_AREA_MAX_HEIGHT =
  'max-h-[min(640px,calc(var(--radix-popover-content-available-height)-6rem))]'

type ColumnPickerProps = {
  visibleColSet: Set<string>
  onVisibleChange: (next: Set<string>) => void
  onReset: () => void
  columns: readonly AssetSearchColumn[]
}

function matchesQuery(column: AssetSearchColumn, query: string): boolean {
  if (query.length === 0) return true
  return column.label.toLowerCase().includes(query.toLowerCase())
}

function SearchBar({
  query,
  onQueryChange,
}: {
  query: string
  onQueryChange: (next: string) => void
}): React.JSX.Element {
  return (
    <div className="relative">
      <MagnifyingGlassIcon
        className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"
        size={14}
      />
      <Input
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder={SEARCH_PLACEHOLDER}
        className="h-8 pl-7 text-sm"
      />
    </div>
  )
}

function SectionHeader({
  label,
  allVisible,
  onToggle,
}: {
  label: string
  allVisible: boolean
  onToggle: () => void
}): React.JSX.Element {
  const switchId = useId()
  return (
    <div className="flex w-full items-center justify-between gap-2 px-2 py-2 text-sm font-medium text-foreground">
      <span className="min-w-0 truncate">{label}</span>
      <div className="flex shrink-0 items-center gap-1.5">
        <Label htmlFor={switchId} className="cursor-pointer text-xs text-muted-foreground">
          {ALL_TOGGLE_LABEL}
        </Label>
        <Switch id={switchId} checked={allVisible} onCheckedChange={onToggle} />
      </div>
    </div>
  )
}

function ColumnRow({
  column,
  isOn,
  onToggle,
}: {
  column: AssetSearchColumn
  isOn: boolean
  onToggle: (checked: boolean) => void
}): React.JSX.Element {
  const switchId = useId()
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded py-1 pl-6 pr-2 text-sm',
        'hover:bg-accent hover:text-accent-foreground',
      )}
    >
      <Switch id={switchId} checked={isOn} onCheckedChange={onToggle} />
      <Label htmlFor={switchId} className="min-w-0 flex-1 cursor-pointer font-normal">
        <span className="truncate">{column.label}</span>
      </Label>
    </div>
  )
}

function ResetFooter({ onReset }: { onReset: () => void }): React.JSX.Element {
  return (
    <div className="border-t pt-1.5 -mx-0.5 px-1.5">
      <Button
        variant="ghost"
        size="sm"
        onClick={onReset}
        className="h-7 w-full justify-start px-2 text-xs text-muted-foreground"
      >
        {RESET_LABEL}
      </Button>
    </div>
  )
}

export function ColumnPicker({
  visibleColSet,
  onVisibleChange,
  onReset,
  columns: allColumns,
}: ColumnPickerProps): React.JSX.Element {
  const [query, setQuery] = useState('')

  const groupedSections = useMemo(
    () =>
      COLUMN_SECTIONS.map((section) => {
        const columns = allColumns.filter((c) => c.section === section.id && matchesQuery(c, query))
        const visibleColumns = columns.filter((c) => visibleColSet.has(c.id))
        return { section, columns, visibleColumns }
      }).filter((g) => g.columns.length > 0),
    [query, visibleColSet, allColumns],
  )

  const hasAnyMatch = groupedSections.length > 0

  function toggleColumn(id: string, checked: boolean) {
    const newVisibleSet = new Set(visibleColSet)
    if (checked) newVisibleSet.add(id)
    else newVisibleSet.delete(id)
    onVisibleChange(newVisibleSet)
  }

  function toggleSection(enabledIds: string[], allOn: boolean) {
    const newVisibleSet = new Set(visibleColSet)
    if (allOn) {
      for (const id of enabledIds) newVisibleSet.delete(id)
    } else {
      for (const id of enabledIds) newVisibleSet.add(id)
    }
    onVisibleChange(newVisibleSet)
  }

  return (
    <div className="flex flex-col gap-2 -m-0.5">
      <SearchBar query={query} onQueryChange={setQuery} />

      <div className={cn(SCROLL_AREA_MAX_HEIGHT, 'overflow-y-auto -mx-0.5 px-0.5')}>
        {/* The multi-column element must size to its content: capping its height instead
            makes the browser lay the overflow out as further columns to the right. */}
        <div className="columns-2 gap-4">
          {hasAnyMatch ? (
            groupedSections.map(({ section, columns, visibleColumns }) => {
              const allOn = visibleColumns.length === columns.length
              const columnIds = columns.map((c) => c.id)
              return (
                <div key={section.id} className="mb-4 break-inside-avoid last:mb-0">
                  <SectionHeader
                    label={section.label}
                    allVisible={allOn}
                    onToggle={() => toggleSection(columnIds, allOn)}
                  />
                  {columns.map((col) => (
                    <ColumnRow
                      key={col.id}
                      column={col}
                      isOn={visibleColSet.has(col.id)}
                      onToggle={(checked) => toggleColumn(col.id, checked)}
                    />
                  ))}
                </div>
              )
            })
          ) : (
            <div className="px-2 py-4 text-sm text-muted-foreground">{EMPTY_RESULT_TEXT}</div>
          )}
        </div>
      </div>

      <ResetFooter onReset={onReset} />
    </div>
  )
}
