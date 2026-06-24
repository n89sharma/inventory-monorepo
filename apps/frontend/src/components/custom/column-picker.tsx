import { Button } from '@/components/shadcn/button'
import { Checkbox } from '@/components/shadcn/checkbox'
import { Input } from '@/components/shadcn/input'
import {
  COLUMN_SECTIONS,
  type AssetTableColumn,
} from '@/components/pages/column-defs/asset-table-columns'
import { cn } from '@/lib/utils'
import { MagnifyingGlassIcon } from '@phosphor-icons/react'
import { useMemo, useState } from 'react'

const SEARCH_PLACEHOLDER = 'Search columns'
const EMPTY_RESULT_TEXT = 'No columns match'
const RESET_LABEL = 'Reset to defaults'

type ColumnPickerProps = {
  visibleColSet: Set<string>
  onVisibleChange: (next: Set<string>) => void
  onReset: () => void
  columns: readonly AssetTableColumn[]
}

function matchesQuery(column: AssetTableColumn, query: string): boolean {
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
  visibleCount,
  enabledCount,
  onToggle,
}: {
  label: string
  visibleCount: number
  enabledCount: number
  onToggle: () => void
}): React.JSX.Element {
  const isInteractive = enabledCount > 0
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={!isInteractive}
      className={cn(
        'flex w-full items-center justify-between rounded px-2 py-1.5',
        'text-xs font-medium uppercase tracking-wide text-muted-foreground',
        isInteractive ? 'hover:bg-accent hover:text-accent-foreground' : 'cursor-default',
      )}
    >
      <span>{label}</span>
      <span className="tabular-nums">
        {visibleCount}/{enabledCount}
      </span>
    </button>
  )
}

function ColumnRow({
  column,
  isOn,
  onToggle,
}: {
  column: AssetTableColumn
  isOn: boolean
  onToggle: (checked: boolean) => void
}): React.JSX.Element {
  return (
    <label
      className={cn(
        'flex items-center gap-2 rounded px-2 py-1 text-sm',
        column.enabled
          ? 'cursor-pointer hover:bg-accent hover:text-accent-foreground'
          : 'cursor-not-allowed text-muted-foreground/60',
      )}
    >
      <Checkbox
        checked={isOn}
        disabled={!column.enabled}
        onCheckedChange={(checked) => onToggle(!!checked)}
      />
      <span className="truncate">{column.label}</span>
    </label>
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
        const columns = allColumns.filter(
          (c) => c.section === section.id && c.enabled && matchesQuery(c, query),
        )
        const enabled = columns.filter((c) => c.enabled)
        const visibleEnabled = enabled.filter((c) => visibleColSet.has(c.id))
        return { section, columns, enabled, visibleEnabled }
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

      <div className="max-h-[440px] overflow-y-auto -mx-0.5 px-0.5">
        {hasAnyMatch ? (
          groupedSections.map(({ section, columns, enabled, visibleEnabled }) => {
            const allEnabledOn = enabled.length > 0 && visibleEnabled.length === enabled.length
            const enabledIds = enabled.map((c) => c.id)
            return (
              <div key={section.id} className="mb-1 last:mb-0">
                <SectionHeader
                  label={section.label}
                  visibleCount={visibleEnabled.length}
                  enabledCount={enabled.length}
                  onToggle={() => toggleSection(enabledIds, allEnabledOn)}
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

      <ResetFooter onReset={onReset} />
    </div>
  )
}
