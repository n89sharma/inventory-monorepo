import { Button } from '@/components/shadcn/button'
import { sortableHeader } from '@/components/table-columns/shared-columns'
import { CheckCircleIcon } from '@phosphor-icons/react'
import type { ColumnDef } from '@tanstack/react-table'
import type { User } from 'shared-types'

function ActivationButton({
  user,
  onDeactivate,
  onReactivate,
}: {
  user: User
  onDeactivate: (user: User) => void
  onReactivate: (user: User) => void
}) {
  if (user.is_active) {
    return (
      <Button variant="destructive" size="sm" onClick={() => onDeactivate(user)}>
        Deactivate
      </Button>
    )
  }
  return (
    <Button variant="outline" size="sm" onClick={() => onReactivate(user)}>
      Reactivate
    </Button>
  )
}

export function createUserPermissionTableColumns(
  currentUserId: number | null | undefined,
  onEditRole: (user: User) => void,
  onDeactivate: (user: User) => void,
  onReactivate: (user: User) => void,
): ColumnDef<User>[] {
  return [
    {
      accessorKey: 'name',
      filterFn: 'includesString',
      header: sortableHeader<User>('Name'),
    },
    {
      accessorKey: 'email',
      filterFn: 'includesString',
      header: sortableHeader<User>('Email'),
    },
    {
      accessorKey: 'role',
      header: sortableHeader<User>('Role'),
      cell: ({ row }) => row.original.role ?? '',
    },
    {
      id: 'clerk_user',
      header: () => <div className="px-3">Clerk user</div>,
      cell: ({ row }) => (
        <div className="flex gap-2 justify-center">
          {row.original.clerk_id ? (
            <CheckCircleIcon weight="fill" className="text-green-600 size-4.5" />
          ) : null}
        </div>
      ),
    },
    {
      accessorKey: 'is_active',
      header: sortableHeader<User>('Status'),
      cell: ({ row }) => (row.original.is_active ? 'Active' : 'Inactive'),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const user = row.original
        if (user.id === currentUserId || user.role === 'admin' || !user.clerk_id) return null
        return (
          <div className="flex gap-2 justify-center">
            <Button variant="outline" size="sm" onClick={() => onEditRole(user)}>
              Edit
            </Button>
            <ActivationButton user={user} onDeactivate={onDeactivate} onReactivate={onReactivate} />
          </div>
        )
      },
    },
  ]
}
