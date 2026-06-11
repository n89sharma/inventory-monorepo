import { MultiSelectOptionsInline } from '@/components/custom/multi-select-options'
import { useReferenceDataStore } from '@/data/store/reference-data-store'
import { useMemo } from 'react'
import type { Warehouse } from 'shared-types'

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
  return (
    <MultiSelectOptionsInline
      selection={selection}
      onSelectionChange={onSelectionChange}
      options={activeWarehouses}
      getLabel={w => w.city_code}
      fieldLabel='Warehouse'
      className='w-45'
    />
  )
}
