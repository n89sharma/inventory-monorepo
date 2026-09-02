import { Button } from '@/components/shadcn/button'
import { Checkbox } from '@/components/shadcn/checkbox'
import { Label } from '@/components/shadcn/label'
import { useRoleMutations } from '@/hooks/use-role-mutations'
import { formatTitleCase } from '@/lib/formatters'
import { CircleNotchIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { PERMISSIONS, type Permission, type Role } from 'shared-types'
import { toast } from 'sonner'

const SORTED_PERMISSIONS = [...PERMISSIONS].sort()

interface RolePermissionEditorProps {
  role: Role
}

export function RolePermissionEditor({ role }: RolePermissionEditorProps): React.JSX.Element {
  const { setRolePermissions } = useRoleMutations()
  const [granted, setGranted] = useState<Set<Permission>>(new Set(role.permissions))
  const [saving, setSaving] = useState(false)

  function toggle(permission: Permission, checked: boolean) {
    setGranted((prev) => {
      const currGranted = new Set(prev)
      if (checked) currGranted.add(permission)
      else currGranted.delete(permission)
      return currGranted
    })
  }

  async function handleSave() {
    setSaving(true)
    try {
      await setRolePermissions(role.code, [...granted])
      toast.success(`${role.name} permissions saved`, { position: 'top-center' })
    } catch {
      // interceptor already showed the error toast
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-semibold">{role.name}</h2>
        <SystemRoleNote role={role} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <ul className="grid gap-2 sm:grid-cols-2">
          {SORTED_PERMISSIONS.map((permission) => (
            <li key={permission} className="flex items-center gap-2">
              <Checkbox
                id={`permission-${permission}`}
                checked={granted.has(permission)}
                disabled={role.is_system}
                onCheckedChange={(checked) => toggle(permission, checked === true)}
              />
              <Label htmlFor={`permission-${permission}`} className="font-normal">
                {formatTitleCase(permission)}
              </Label>
            </li>
          ))}
        </ul>
      </div>

      {!role.is_system && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <CircleNotchIcon className="animate-spin" /> : null}
            Save permissions
          </Button>
        </div>
      )}
    </div>
  )
}

function SystemRoleNote({ role }: RolePermissionEditorProps): React.JSX.Element | null {
  if (!role.is_system) return null
  return (
    <p className="text-muted-foreground text-sm">
      System role — always holds every permission, and cannot be edited or deleted.
    </p>
  )
}
