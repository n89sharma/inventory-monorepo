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
import { DataTable } from '@/components/shadcn/data-table'
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
import { PageContent } from '@/components/layout/page-content'
import { useUserStore } from '@/data/store/user-store'
import { formatTitleCase } from '@/lib/formatters'
import { useUser } from '@clerk/react'
import { CircleNotchIcon } from '@phosphor-icons/react'
import { useCallback, useMemo, useState } from 'react'
import { AppRoles, type AppRole, type User } from 'shared-types'
import { toast } from 'sonner'
import { createUserPermissionTableColumns } from '../column-defs/user-permission-table-columns'

const ASSIGNABLE_ROLES = AppRoles.filter(r => r !== 'admin')

export function UserManagementPage() {
  const { user: clerkUser } = useUser()
  const currentUserEmail = clerkUser?.primaryEmailAddress?.emailAddress

  const users = useUserStore(state => state.users)
  const setUserRole = useUserStore(state => state.setUserRole)
  const toggleUserActive = useUserStore(state => state.toggleUserActive)

  const [showActiveOnly, setShowActiveOnly] = useState(true)
  const [showClerkOnly, setShowClerkOnly] = useState(true)
  const [editRoleTarget, setEditRoleTarget] = useState<User | null>(null)
  const [selectedRole, setSelectedRole] = useState<AppRole | ''>('')
  const [roleSaving, setRoleSaving] = useState(false)
  const [deactivateTarget, setDeactivateTarget] = useState<User | null>(null)

  const displayedUsers = users.filter(u =>
    (!showActiveOnly || u.is_active) &&
    (!showClerkOnly || u.clerk_id !== null)
  )

  const handleEditRole = useCallback((user: User) => {
    setSelectedRole('')
    setEditRoleTarget(user)
  }, [])

  const handleDeactivate = useCallback((user: User) => {
    setDeactivateTarget(user)
  }, [])

  const handleReactivate = useCallback(async (user: User) => {
    try {
      await toggleUserActive(user.id, true)
      toast.success(`${user.name} reactivated.`, { position: 'top-center' })
    } catch {
      // apiErrorHandler already toasted
    }
  }, [toggleUserActive])

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
    () => createUserPermissionTableColumns(currentUserEmail, handleEditRole, handleDeactivate, handleReactivate),
    [currentUserEmail, handleEditRole, handleDeactivate, handleReactivate],
  )

  return (
    <PageContent className="flex flex-col gap-4">
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

      <DataTable columns={columns} data={displayedUsers} initialPageSize={25} />

      {/* Edit Role modal */}
      <Dialog open={!!editRoleTarget} onOpenChange={open => { if (!open) setEditRoleTarget(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Role — {editRoleTarget?.name}</DialogTitle>
          </DialogHeader>
          <Field>
            <FieldLabel>New Role</FieldLabel>
            <Select value={selectedRole} onValueChange={val => setSelectedRole(val as AppRole)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectGroup>
                  {ASSIGNABLE_ROLES.map(role => (
                    <SelectItem key={role} value={role}>
                      {formatTitleCase(role)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditRoleTarget(null)}
              disabled={roleSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveRole} disabled={!selectedRole || roleSaving}>
              {roleSaving ? <><CircleNotchIcon className="animate-spin" />Saving…</> : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate confirmation */}
      <AlertDialog open={!!deactivateTarget} onOpenChange={open => { if (!open) setDeactivateTarget(null) }}>
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
    </PageContent>
  )
}
