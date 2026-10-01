import { Button } from '@/components/shadcn/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/shadcn/popover'
import { useCan } from '@/hooks/use-can'
import {
  ASSET_SEARCH_COLUMNS,
  COLUMN_SECTIONS,
  canViewColumn,
  type AssetSearchColumn,
} from '@/components/table-columns/asset-search-columns'
import { SlidersIcon } from '@phosphor-icons/react'
import { useMemo } from 'react'
import { ColumnPicker, type PickerColumn, type PickerSection } from './column-picker'

type ColumnPickerVisibilityProps = {
  visible: Set<string>
  onVisibleChange: (next: Set<string>) => void
  onReset: () => void
}

type ColumnPickerPopoverProps = ColumnPickerVisibilityProps & {
  columns: readonly PickerColumn[]
  sections: readonly PickerSection[]
}

export function ColumnPickerPopover({
  visible,
  onVisibleChange,
  onReset,
  columns,
  sections,
}: ColumnPickerPopoverProps): React.JSX.Element {
  const visibleCount = columns.filter((c) => visible.has(c.id)).length
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label={`Columns (${visibleCount} of ${columns.length} shown)`}
        >
          <SlidersIcon />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-144 p-2">
        <ColumnPicker
          visibleColSet={visible}
          onVisibleChange={onVisibleChange}
          onReset={onReset}
          columns={columns}
          sections={sections}
        />
      </PopoverContent>
    </Popover>
  )
}

export function ColumnPickerButton({
  visible,
  onVisibleChange,
  onReset,
}: ColumnPickerVisibilityProps): React.JSX.Element {
  const can = useCan()
  const permittedColumns = useMemo<readonly AssetSearchColumn[]>(
    () => ASSET_SEARCH_COLUMNS.filter((column) => canViewColumn(column, can)),
    [can],
  )
  return (
    <ColumnPickerPopover
      visible={visible}
      onVisibleChange={onVisibleChange}
      onReset={onReset}
      columns={permittedColumns}
      sections={COLUMN_SECTIONS}
    />
  )
}
