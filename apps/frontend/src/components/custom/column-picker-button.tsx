import { Button } from '@/components/shadcn/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/shadcn/popover'
import { ColumnsIcon } from '@phosphor-icons/react'
import { ColumnPicker } from './column-picker'

type ColumnPickerButtonProps = {
  visible: Set<string>
  onVisibleChange: (next: Set<string>) => void
  onReset: () => void
  totalPickable: number
}

export function ColumnPickerButton({
  visible,
  onVisibleChange,
  onReset,
  totalPickable,
}: ColumnPickerButtonProps): React.JSX.Element {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant='outline' size='sm' className='gap-1.5'>
          <ColumnsIcon />
          <span>Columns ({visible.size} / {totalPickable})</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align='end' className='w-72 p-2'>
        <ColumnPicker
          visibleColSet={visible}
          onVisibleChange={onVisibleChange}
          onReset={onReset}
        />
      </PopoverContent>
    </Popover>
  )
}
