import { createEditColumn } from '@/components/table-columns/column-primitives'
import { formatDate } from '@/lib/formatters'
import type { ColumnDef } from '@tanstack/react-table'
import type { AdminRelease } from 'shared-types'

const DRAFT_LABEL = 'Draft'
const PUBLISHED_LABEL = 'Published'

export function createReleaseTableColumns(
  onEdit: (release: AdminRelease) => void,
): ColumnDef<AdminRelease>[] {
  return [
    {
      id: 'published_at',
      accessorFn: (release) => release.published_at?.getTime() ?? 0,
      header: 'Date',
      cell: ({ row }) => formatDate(row.original.published_at),
    },
    {
      id: 'state',
      accessorFn: (release) => (release.published_at === null ? DRAFT_LABEL : PUBLISHED_LABEL),
      header: 'State',
    },
    {
      id: 'notes',
      accessorFn: (release) => release.notes.length,
      header: 'Notes',
    },
    {
      accessorKey: 'version',
      header: 'Version',
    },
    {
      accessorKey: 'created_by_name',
      header: 'Created By',
    },
    createEditColumn<AdminRelease>(onEdit, 'Edit release'),
  ]
}
