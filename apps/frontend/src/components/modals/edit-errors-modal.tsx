import { Button } from "@/components/shadcn/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/shadcn/dialog"
import { useAssetStore } from "@/data/store/asset-store"
import { useReferenceDataStore } from "@/data/store/reference-data-store"
import { useEffect, useState } from "react"
import type { AssetDetails, AssetError, UpdateError } from "shared-types"
import { toast } from "sonner"
import { AssetErrorsEditor } from "../custom/asset-errors-editor"
import { SearchSelectInput } from "../custom/search-select-input"
import { UnsavedChangesDialog } from "../custom/unsaved-changes-dialog"

interface EditErrorsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  assetDetails: AssetDetails | null
  errors: AssetError[]
}

export function EditErrorsModal({ open, onOpenChange, assetDetails, errors }: EditErrorsModalProps) {
  const brands = useReferenceDataStore(state => state.brands)
  const updateAssetErrors = useAssetStore(state => state.updateAssetErrors)

  const [localErrors, setLocalErrors] = useState<UpdateError[]>([])
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false)

  useEffect(() => {
    if (open) {
      setLocalErrors(errors.map(e => ({ error_id: e.error_id, is_fixed: e.is_fixed })))
      setDirty(false)
    }
  }, [open])

  if (!assetDetails) return null

  const brandId = brands.find(b => b.name === assetDetails.brand)?.id ?? null

  function handleChange(next: UpdateError[]) {
    setLocalErrors(next)
    setDirty(true)
  }

  async function handleSave() {
    if (!assetDetails) return
    setSaving(true)
    try {
      await updateAssetErrors(assetDetails.barcode, localErrors)
      toast.success('Errors updated.')
      onOpenChange(false)
    } catch {
      // interceptor already showed the error toast
    }
    setSaving(false)
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && dirty) {
      setConfirmCloseOpen(true)
      return
    }
    onOpenChange(nextOpen)
  }

  function discardAndClose() {
    setConfirmCloseOpen(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] min-h-[500px] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Errors</DialogTitle>
        </DialogHeader>

        <AssetErrorsEditor
          value={localErrors}
          onChange={handleChange}
          brandId={brandId}
          renderSearch={slot => <SearchSelectInput {...slot} placeholder="Add error" />}
        />

        {localErrors.length === 0 && (
          <p className="px-3 py-4 text-center text-muted-foreground">
            No errors — add at least one.
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} type="button">
            Cancel
          </Button>
          <Button onClick={handleSave} type="button" disabled={saving || !dirty}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
      <UnsavedChangesDialog
        open={confirmCloseOpen}
        onOpenChange={setConfirmCloseOpen}
        onDiscard={discardAndClose}
      />
    </Dialog>
  )
}
