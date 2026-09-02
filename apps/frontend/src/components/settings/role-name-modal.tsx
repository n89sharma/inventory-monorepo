import { Button } from '@/components/shadcn/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/shadcn/dialog'
import { Field, FieldGroup, FieldLabel } from '@/components/shadcn/field'
import { Input } from '@/components/shadcn/input'
import { CircleNotchIcon } from '@phosphor-icons/react'
import { useState } from 'react'

interface RoleNameModalProps {
  title: string
  submitLabel: string
  initialName: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (name: string) => Promise<void>
}

// Create and rename ask for the same single field, so they share one dialog and differ only
// in the wording and the action the caller injects.
export function RoleNameModal({
  title,
  submitLabel,
  initialName,
  open,
  onOpenChange,
  onSubmit,
}: RoleNameModalProps): React.JSX.Element {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <RoleNameFormBody
          submitLabel={submitLabel}
          initialName={initialName}
          onOpenChange={onOpenChange}
          onSubmit={onSubmit}
        />
      </DialogContent>
    </Dialog>
  )
}

function RoleNameFormBody({
  submitLabel,
  initialName,
  onOpenChange,
  onSubmit,
}: Omit<RoleNameModalProps, 'title' | 'open'>): React.JSX.Element {
  const [name, setName] = useState(initialName)
  const [saving, setSaving] = useState(false)

  async function handleSubmit() {
    setSaving(true)
    try {
      await onSubmit(name.trim())
      onOpenChange(false)
    } catch {
      // interceptor already showed the error toast
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="role-name">Role name</FieldLabel>
          <Input
            id="role-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Warehouse Lead"
            autoFocus
          />
        </Field>
      </FieldGroup>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={!name.trim() || saving}>
          {saving ? <CircleNotchIcon className="animate-spin" /> : null}
          {submitLabel}
        </Button>
      </DialogFooter>
    </>
  )
}
