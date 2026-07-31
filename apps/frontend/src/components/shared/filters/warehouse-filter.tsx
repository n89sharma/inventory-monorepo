import { ExclusiveOptionsFilter } from '@/components/shared/filters/exclusive-options-filter'
import { useActiveWarehouses } from '@/hooks/use-active-warehouses'
import type { Warehouse } from 'shared-types'

const ALL_LABEL = 'All Warehouses'
const GROUP_LABEL = 'Filter by warehouse'
const ALL_ARIA_LABEL = 'Select all warehouses'

export function WarehouseFilter({
  selection,
  onSelectionChange,
}: {
  selection: Warehouse[]
  onSelectionChange: (warehouses: Warehouse[]) => void
}): React.JSX.Element {
  const activeWarehouses = useActiveWarehouses()

  return (
    <ExclusiveOptionsFilter
      options={activeWarehouses}
      selection={selection}
      onSelectionChange={onSelectionChange}
      getLabel={(w) => w.city_code}
      allLabel={ALL_LABEL}
      groupLabel={GROUP_LABEL}
      getOptionAriaLabel={(w) => `Filter by ${w.city_code} warehouse`}
      allAriaLabel={ALL_ARIA_LABEL}
    />
  )
}
