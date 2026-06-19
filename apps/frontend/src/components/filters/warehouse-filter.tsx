import { Toggle } from '@/components/shadcn/toggle'
import { useActiveWarehouses } from '@/hooks/use-active-warehouses'
import type { Warehouse } from 'shared-types'

const ALL_LABEL = 'All Warehouses'

export function WarehouseFilter({
  selection,
  onSelectionChange,
}: {
  selection: Warehouse[]
  onSelectionChange: (warehouses: Warehouse[]) => void
}): React.JSX.Element {
  const activeWarehouses = useActiveWarehouses()

  const isAll = selection.length === 0
  const isOnly = (w: Warehouse) =>
    selection.length === 1 && selection[0].id === w.id

  return (
    <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Filter by warehouse">
      <Toggle
        variant="outline"
        pressed={isAll}
        onPressedChange={() => onSelectionChange([])}
        aria-label="Select all warehouses"
      >
        {ALL_LABEL}
      </Toggle>
      {activeWarehouses.map(w => (
        <Toggle
          key={w.id}
          variant="outline"
          pressed={isOnly(w)}
          onPressedChange={pressed => onSelectionChange(pressed ? [w] : [])}
          aria-label={`Filter by ${w.city_code} warehouse`}
        >
          {w.city_code}
        </Toggle>
      ))}
    </div>
  )
}
