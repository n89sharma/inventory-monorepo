import { Checkbox } from '@/components/shadcn/checkbox'
import { createEditColumn } from '@/components/table-columns/column-primitives'
import type { ColumnDef } from '@tanstack/react-table'
import type { ComponentSummary } from 'shared-types'

const ACTIVE_LABEL = 'Active'
const INACTIVE_LABEL = 'Inactive'

export function createComponentTableColumns(
  onEdit: ((component: ComponentSummary) => void) | undefined,
): ColumnDef<ComponentSummary>[] {
  return [
    {
      accessorKey: 'brand_name',
      filterFn: 'includesString',
      header: 'Brand',
    },
    {
      accessorKey: 'name',
      filterFn: 'includesString',
      header: 'Name',
    },
    {
      id: 'is_active',
      accessorFn: (component) => (component.is_active ? ACTIVE_LABEL : INACTIVE_LABEL),
      filterFn: 'equals',
      header: 'Active',
      cell: ({ row }) => (
        <div className="flex justify-center">
          <Checkbox checked={row.original.is_active} aria-label={ACTIVE_LABEL} />
        </div>
      ),
    },
    ...(onEdit ? [createEditColumn<ComponentSummary>(onEdit, 'Edit component')] : []),
  ]
}
