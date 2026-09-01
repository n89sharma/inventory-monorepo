import { sortableHeader } from '@/components/table-columns/column-primitives'
import type { ColumnDef } from '@tanstack/react-table'
import type { Brand } from 'shared-types'

export const brandTableColumns: ColumnDef<Brand>[] = [
  {
    accessorKey: 'name',
    filterFn: 'includesString',
    header: sortableHeader<Brand>('Name'),
  },
]
