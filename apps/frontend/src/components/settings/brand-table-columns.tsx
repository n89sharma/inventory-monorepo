import { createEditColumn, sortableHeader } from '@/components/table-columns/column-primitives'
import type { ColumnDef } from '@tanstack/react-table'
import type { Brand } from 'shared-types'

export function createBrandTableColumns(
  onEdit: ((brand: Brand) => void) | undefined,
): ColumnDef<Brand>[] {
  return [
    {
      accessorKey: 'name',
      filterFn: 'includesString',
      header: sortableHeader<Brand>('Name'),
    },
    ...(onEdit ? [createEditColumn<Brand>(onEdit, 'Edit brand')] : []),
  ]
}
