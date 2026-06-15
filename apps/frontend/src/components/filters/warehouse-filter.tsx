import { Toggle } from '@/components/shadcn/toggle'
import { useReferenceDataStore } from '@/data/store/reference-data-store'
import { useMemo } from 'react'
import type { Warehouse } from 'shared-types'

const ALL_LABEL = 'All Warehouses'

export function WarehouseFilter({
  selection,
  onSelectionChange,
}: {
  selection: Warehouse[]
  onSelectionChange: (warehouses: Warehouse[]) => void
}): React.JSX.Element {
  const allWarehouses = useReferenceDataStore(state => state.warehouses)
  const activeWarehouses = useMemo(
    () => allWarehouses.filter(w => w.is_active),
    [allWarehouses],
  )

  const isAll = activeWarehouses.length > 0
    && selection.length === activeWarehouses.length
  const isOnly = (w: Warehouse) =>
    selection.length === 1 && selection[0].id === w.id

  return (
    <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Filter by warehouse">
      <Toggle
        variant="outline"
        pressed={isAll}
        onPressedChange={pressed => onSelectionChange(pressed ? activeWarehouses : [])}
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
