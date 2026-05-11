import { Button } from '@/components/shadcn/button'
import { ArrowsDownUpIcon } from '@phosphor-icons/react'
import type { ColumnDef } from '@tanstack/react-table'
import type { User } from 'shared-types'

export function createUserPermissionTableColumns(
  currentUserEmail: string | null | undefined,
  onEditRole: (user: User) => void,
  onDeactivate: (user: User) => void,
  onReactivate: (user: User) => void,
): ColumnDef<User>[] {
  return [
    {
      accessorKey: 'name',
      size: 180,
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Name <ArrowsDownUpIcon />
        </Button>
      ),
    },
    {
      accessorKey: 'email',
      size: 220,
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Email <ArrowsDownUpIcon />
        </Button>
      ),
    },
    {
      accessorKey: 'role',
      size: 160,
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Role <ArrowsDownUpIcon />
        </Button>
      ),
      cell: ({ row }) => row.original.role ?? 'Unassigned',
    },
    {
      accessorKey: 'is_active',
      size: 100,
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Status <ArrowsDownUpIcon />
        </Button>
      ),
      cell: ({ row }) => (row.original.is_active ? 'Active' : 'Inactive'),
    },
    {
      id: 'actions',
      size: 200,
      cell: ({ row }) => {
        const user = row.original
        if (user.email === currentUserEmail || user.role === 'admin') return null
        return (
          <div className="flex gap-2 justify-center">
            <Button variant="outline" size="sm" onClick={() => onEditRole(user)}>
              Edit Role
            </Button>
            {user.is_active
              ? (
                <Button variant="destructive" size="sm" onClick={() => onDeactivate(user)}>
                  Deactivate
                </Button>
              )
              : (
                <Button variant="outline" size="sm" onClick={() => onReactivate(user)}>
                  Reactivate
                </Button>
              )
            }
          </div>
        )
      },
    },
  ]
}
