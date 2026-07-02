import { Button } from '@/components/shadcn/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/shadcn/dialog'
import { useAssetStore } from '@/data/store/asset-store'
import { useReferenceDataStore } from '@/data/store/reference-data-store'
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard'
import { useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import type { AssetDetails, AssetError, UpdateError } from 'shared-types'
import { toast } from 'sonner'
import { SearchSelectInput } from '../shared/search-select/search-select-input'
import { UnsavedChangesDialog } from '../shared/unsaved-changes-dialog'
import { AssetErrorsEditor } from './asset-errors-editor'

interface EditErrorsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  assetDetails: AssetDetails | null
  errors: AssetError[]
}

interface ErrorsForm {
  errors: UpdateError[]
}

function toErrorsForm(errors: AssetError[]): ErrorsForm {
  return { errors: errors.map((e) => ({ error_id: e.error_id, is_fixed: e.is_fixed })) }
}

export function EditErrorsModal({
  open,
  onOpenChange,
  assetDetails,
  errors,
}: EditErrorsModalProps) {
  const brands = useReferenceDataStore((state) => state.brands)
  const updateAssetErrors = useAssetStore((state) => state.updateAssetErrors)

  const [saving, setSaving] = useState(false)

  const values = useMemo(() => toErrorsForm(errors), [errors])
  const form = useForm<ErrorsForm>({ values })
  const localErrors = useWatch({ control: form.control, name: 'errors' })

  const guard = useUnsavedChangesGuard(form.formState.isDirty, onOpenChange, () => form.reset())

  if (!assetDetails) return null

  const brandId = brands.find((b) => b.name === assetDetails.brand)?.id ?? null

  function handleChange(next: UpdateError[]) {
    form.setValue('errors', next, { shouldDirty: true })
  }

  async function handleSave() {
    if (!assetDetails) return
    setSaving(true)
    try {
      const next = form.getValues().errors
      await updateAssetErrors(assetDetails.barcode, next)
      form.reset({ errors: next })
      toast.success('Errors updated.')
      onOpenChange(false)
    } catch {
      // interceptor already showed the error toast
    }
    setSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={guard.onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] min-h-[500px] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Errors</DialogTitle>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-1 py-2">
          <AssetErrorsEditor
            value={localErrors}
            onChange={handleChange}
            brandId={brandId}
            renderSearch={(slot) => <SearchSelectInput {...slot} placeholder="Add error" />}
          />

          {localErrors.length === 0 && (
            <p className="px-3 py-4 text-center text-muted-foreground">
              No errors — add at least one.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => guard.onOpenChange(false)} type="button">
            Cancel
          </Button>
          <Button onClick={handleSave} type="button" disabled={saving || !form.formState.isDirty}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
      <UnsavedChangesDialog
        open={guard.confirmOpen}
        onOpenChange={guard.setConfirmOpen}
        onDiscard={guard.discard}
      />
    </Dialog>
  )
}
