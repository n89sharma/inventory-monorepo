import { GridPageContent, PageSection } from '@/components/app-layout/page-content'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/shadcn/alert-dialog'
import { Button } from '@/components/shadcn/button'
import { DataGrid } from '@/components/shared/data-table'
import { ColumnTextFilter } from '@/components/shared/filters/column-text-filter'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/shadcn/dialog'
import { Field, FieldLabel } from '@/components/shadcn/field'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shadcn/select'
import { Toggle } from '@/components/shadcn/toggle'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useRoles } from '@/hooks/use-role-list'
import { useUsers } from '@/hooks/use-user'
import { useUserMutations } from '@/hooks/use-user-mutations'
import { CircleNotchIcon } from '@phosphor-icons/react'
import { useCallback, useMemo, useState } from 'react'
import { type User } from 'shared-types'
import { toast } from 'sonner'
import { createUserPermissionTableColumns } from './user-permission-table-columns'

const TABLE_LABEL = 'Users'

export function UserManagementPage() {
  const currentUserId = useCurrentUser()?.id

  const users = useUsers()
  const roles = useRoles()
  const { setUserRole, toggleUserActive } = useUserMutations()

  const [showActiveOnly, setShowActiveOnly] = useState(true)
  const [showClerkOnly, setShowClerkOnly] = useState(true)
  const [editRoleTarget, setEditRoleTarget] = useState<User | null>(null)
  const [selectedRole, setSelectedRole] = useState('')
  const [roleSaving, setRoleSaving] = useState(false)
  const [deactivateTarget, setDeactivateTarget] = useState<User | null>(null)

  const displayedUsers = users.filter(
    (u) => (!showActiveOnly || u.is_active) && (!showClerkOnly || u.clerk_id !== null),
  )

  const handleEditRole = useCallback((user: User) => {
    setSelectedRole('')
    setEditRoleTarget(user)
  }, [])

  const handleDeactivate = useCallback((user: User) => {
    setDeactivateTarget(user)
  }, [])

  const handleReactivate = useCallback(
    async (user: User) => {
      try {
        await toggleUserActive(user.id, true)
        toast.success(`${user.name} reactivated.`, { position: 'top-center' })
      } catch {
        // apiErrorHandler already toasted
      }
    },
    [toggleUserActive],
  )

  async function handleSaveRole() {
    if (!editRoleTarget || !selectedRole) return
    setRoleSaving(true)
    try {
      await setUserRole(editRoleTarget.id, selectedRole)
      toast.success(`Role updated for ${editRoleTarget.name}.`, { position: 'top-center' })
      setEditRoleTarget(null)
    } catch {
      // apiErrorHandler already toasted
    }
    setRoleSaving(false)
  }

  async function handleConfirmDeactivate() {
    if (!deactivateTarget) return
    try {
      await toggleUserActive(deactivateTarget.id, false)
      toast.success(`${deactivateTarget.name} deactivated.`, { position: 'top-center' })
      setDeactivateTarget(null)
    } catch {
      // apiErrorHandler already toasted
    }
  }

  const columns = useMemo(
    () =>
      createUserPermissionTableColumns(
        roles,
        currentUserId,
        handleEditRole,
        handleDeactivate,
        handleReactivate,
      ),
    [roles, currentUserId, handleEditRole, handleDeactivate, handleReactivate],
  )

  return (
    <GridPageContent>
      <PageSection className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">User Management</h1>

        <div className="flex gap-2">
          <Toggle
            size="sm"
            pressed={showActiveOnly}
            onPressedChange={setShowActiveOnly}
            className="w-fit"
            variant="outline"
          >
            Active only
          </Toggle>
          <Toggle
            size="sm"
            pressed={showClerkOnly}
            onPressedChange={setShowClerkOnly}
            className="w-fit"
            variant="outline"
          >
            Clerk users
          </Toggle>
        </div>
      </PageSection>

      <DataGrid
        label={TABLE_LABEL}
        columns={columns}
        data={displayedUsers}
        renderTableFilter={(table) => (
          <>
            <ColumnTextFilter
              table={table}
              columnId="name"
              placeholder="Name"
              clearLabel="Clear name"
              className="w-56"
            />
            <ColumnTextFilter
              table={table}
              columnId="email"
              placeholder="Email"
              clearLabel="Clear email"
              className="w-56"
            />
          </>
        )}
      />

      {/* Edit Role modal */}
      <Dialog
        open={!!editRoleTarget}
        onOpenChange={(open) => {
          if (!open) setEditRoleTarget(null)
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Role — {editRoleTarget?.name}</DialogTitle>
          </DialogHeader>
          <Field>
            <FieldLabel>New Role</FieldLabel>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectGroup>
                  {roles
                    .filter((role) => !role.is_system)
                    .map((role) => (
                      <SelectItem key={role.code} value={role.code}>
                        {role.name}
                      </SelectItem>
                    ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRoleTarget(null)} disabled={roleSaving}>
              Cancel
            </Button>
            <Button onClick={handleSaveRole} disabled={!selectedRole || roleSaving}>
              {roleSaving ? (
                <>
                  <CircleNotchIcon className="animate-spin" />
                  Saving…
                </>
              ) : (
                'Save'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate confirmation */}
      <AlertDialog
        open={!!deactivateTarget}
        onOpenChange={(open) => {
          if (!open) setDeactivateTarget(null)
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate {deactivateTarget?.name}?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel variant="outline">Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleConfirmDeactivate}>
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </GridPageContent>
  )
}
