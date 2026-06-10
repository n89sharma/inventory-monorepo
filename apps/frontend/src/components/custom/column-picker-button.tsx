import { Button } from '@/components/shadcn/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/shadcn/popover'
import { useCan } from '@/hooks/use-can'
import { PICKABLE_COLUMNS, type PickableColumn } from '@/components/pages/column-defs/pickable-columns'
import { ColumnsIcon } from '@phosphor-icons/react'
import { useMemo } from 'react'
import { ColumnPicker } from './column-picker'

type ColumnPickerButtonProps = {
  visible: Set<string>
  onVisibleChange: (next: Set<string>) => void
  onReset: () => void
}

export function ColumnPickerButton({
  visible,
  onVisibleChange,
  onReset,
}: ColumnPickerButtonProps): React.JSX.Element {
  const can = useCan()
  const permittedColumns = useMemo<readonly PickableColumn[]>(
    () => (PICKABLE_COLUMNS as readonly PickableColumn[])
      .filter(c => !c.permission || can(c.permission)),
    [can],
  )
  const enabledCount = permittedColumns.filter(c => !c.disabled).length
  const visibleCount = permittedColumns.filter(c => visible.has(c.id)).length
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant='outline' size='sm' className='gap-1.5'>
          <ColumnsIcon />
          <span>Columns ({visibleCount} / {enabledCount})</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align='end' className='w-72 p-2'>
        <ColumnPicker
          visibleColSet={visible}
          onVisibleChange={onVisibleChange}
          onReset={onReset}
          columns={permittedColumns}
        />
      </PopoverContent>
    </Popover>
  )
}
