import { PageContent } from '@/components/app-layout/page-content'
import { RoleNameModal } from '@/components/settings/role-name-modal'
import { RolePermissionEditor } from '@/components/settings/role-permission-editor'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/shadcn/alert-dialog'
import { Button } from '@/components/shadcn/button'
import { useRoles } from '@/hooks/use-role-list'
import { useRoleMutations } from '@/hooks/use-role-mutations'
import { cn } from '@/lib/utils'
import { PencilSimpleIcon, PlusIcon, TrashIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import type { Role } from 'shared-types'
import { toast } from 'sonner'

export function RolesSettingsPage(): React.JSX.Element {
  const roles = useRoles()
  const { createRole, renameRole, deleteRole } = useRoleMutations()

  const [selectedCode, setSelectedCode] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [renameTarget, setRenameTarget] = useState<Role | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null)

  const selectedRole = roles.find((role) => role.code === selectedCode) ?? roles[0] ?? null

  async function handleCreate(name: string) {
    const role = await createRole(name, [])
    setSelectedCode(role.code)
    toast.success(`${role.name} created`, { position: 'top-center' })
  }

  async function handleRename(name: string) {
    if (!renameTarget) return
    await renameRole(renameTarget.code, name)
    toast.success('Role renamed', { position: 'top-center' })
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteRole(deleteTarget.code)
      if (selectedCode === deleteTarget.code) setSelectedCode(null)
      toast.success(`${deleteTarget.name} deleted`, { position: 'top-center' })
    } catch {
      // interceptor already showed the error toast
    } finally {
      setDeleteTarget(null)
    }
  }

  return (
    <PageContent className="flex h-full min-h-0 flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Roles &amp; Permissions</h1>
        <Button onClick={() => setCreating(true)}>
          <PlusIcon /> Add Role
        </Button>
      </div>

      <div className="grid min-h-0 flex-1 gap-6 md:grid-cols-[16rem_1fr]">
        <RoleList
          roles={roles}
          selectedCode={selectedRole?.code ?? null}
          onSelect={setSelectedCode}
          onRename={setRenameTarget}
          onDelete={setDeleteTarget}
        />
        <SelectedRolePanel role={selectedRole} />
      </div>

      {creating && (
        <RoleNameModal
          title="Create Role"
          submitLabel="Create"
          initialName=""
          open
          onOpenChange={setCreating}
          onSubmit={handleCreate}
        />
      )}

      {renameTarget && (
        <RoleNameModal
          title={`Rename ${renameTarget.name}`}
          submitLabel="Rename"
          initialName={renameTarget.name}
          open
          onOpenChange={(open) => {
            if (!open) setRenameTarget(null)
          }}
          onSubmit={handleRename}
        />
      )}

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Users still assigned to this role must be moved to another one first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContent>
  )
}

interface RoleListProps {
  roles: Role[]
  selectedCode: string | null
  onSelect: (code: string) => void
  onRename: (role: Role) => void
  onDelete: (role: Role) => void
}

function RoleList({
  roles,
  selectedCode,
  onSelect,
  onRename,
  onDelete,
}: RoleListProps): React.JSX.Element {
  return (
    <ul className="min-h-0 overflow-y-auto rounded-md border">
      {roles.map((role) => (
        <li
          key={role.code}
          className={cn(
            'flex items-center gap-1 border-b px-2 py-1 last:border-b-0',
            role.code === selectedCode && 'bg-accent',
          )}
        >
          <button
            type="button"
            className="flex-1 truncate py-1 text-left text-sm"
            onClick={() => onSelect(role.code)}
          >
            {role.name}
          </button>
          <RoleRowActions role={role} onRename={onRename} onDelete={onDelete} />
        </li>
      ))}
    </ul>
  )
}

function RoleRowActions({
  role,
  onRename,
  onDelete,
}: Pick<RoleListProps, 'onRename' | 'onDelete'> & { role: Role }): React.JSX.Element | null {
  if (role.is_system) return null
  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Rename ${role.name}`}
        onClick={() => onRename(role)}
      >
        <PencilSimpleIcon />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Delete ${role.name}`}
        onClick={() => onDelete(role)}
      >
        <TrashIcon />
      </Button>
    </>
  )
}

function SelectedRolePanel({ role }: { role: Role | null }): React.JSX.Element {
  if (!role) {
    return <p className="text-muted-foreground text-sm">Select a role to edit its permissions.</p>
  }
  return <RolePermissionEditor key={role.code} role={role} />
}
