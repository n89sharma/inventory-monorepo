import { createEditColumn, sortableHeader } from '@/components/table-columns/column-primitives'
import type { ColumnDef } from '@tanstack/react-table'
import type { OrgDetail } from 'shared-types'

export function createOrgTableColumns(
  onEdit: ((org: OrgDetail) => void) | undefined,
): ColumnDef<OrgDetail>[] {
  return [
    {
      accessorKey: 'account_number',
      filterFn: 'includesString',
      header: sortableHeader<OrgDetail>('Account Number'),
      cell: ({ row }) => row.original.account_number ?? '',
    },
    {
      accessorKey: 'name',
      filterFn: 'includesString',
      header: sortableHeader<OrgDetail>('Name'),
    },
    {
      accessorKey: 'mobile',
      header: sortableHeader<OrgDetail>('Mobile'),
      cell: ({ row }) => row.original.mobile ?? '',
    },
    {
      accessorKey: 'primary_email',
      header: sortableHeader<OrgDetail>('Email'),
      cell: ({ row }) => row.original.primary_email ?? '',
    },
    {
      accessorKey: 'address',
      header: sortableHeader<OrgDetail>('Address'),
      cell: ({ row }) => row.original.address ?? '',
    },
    {
      accessorKey: 'city',
      header: sortableHeader<OrgDetail>('City'),
      cell: ({ row }) => row.original.city ?? '',
    },
    {
      accessorKey: 'country',
      header: sortableHeader<OrgDetail>('Country'),
      cell: ({ row }) => row.original.country ?? '',
    },
    ...(onEdit ? [createEditColumn<OrgDetail>(onEdit, 'Edit organization')] : []),
  ]
}
