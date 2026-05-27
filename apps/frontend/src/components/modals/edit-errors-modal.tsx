import { Badge } from "@/components/shadcn/badge"
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
import { TrashIcon } from "@phosphor-icons/react"
import { useEffect, useState } from "react"
import type { AssetDetails, AssetError, Error, UpdateError } from "shared-types"
import { toast } from "sonner"
import { PopoverSearch } from "../custom/popover-search"
import { UnsavedChangesDialog } from "../custom/unsaved-changes-dialog"

interface EditErrorsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  assetDetails: AssetDetails | null
  errors: AssetError[]
}

export function EditErrorsModal({ open, onOpenChange, assetDetails, errors }: EditErrorsModalProps) {
  const brands = useReferenceDataStore(state => state.brands)
  const allErrors = useReferenceDataStore(state => state.errors)
  const updateAssetErrors = useAssetStore(state => state.updateAssetErrors)

  const [localErrors, setLocalErrors] = useState<UpdateError[]>([])
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false)
  const [searchResetKey, setSearchResetKey] = useState(0)

  useEffect(() => {
    if (open) {
      setLocalErrors(errors.map(e => ({ code: e.code, is_fixed: e.is_fixed })))
      setDirty(false)
    }
  }, [open])

  if (!assetDetails) return null

  const brandId = brands.find(b => b.name === assetDetails.brand)?.id
  const localCodes = new Set(localErrors.map(e => e.code))
  const availableErrors = allErrors.filter(e => e.brand_id === brandId && !localCodes.has(e.code))

  function handleSelect(error: Error) {
    setLocalErrors(prev => [...prev, { code: error.code, is_fixed: false }])
    setDirty(true)
    setSearchResetKey(k => k + 1)
  }

  function handleToggleFixed(code: string) {
    setLocalErrors(prev => prev.map(e => e.code === code ? { ...e, is_fixed: !e.is_fixed } : e))
    setDirty(true)
  }

  function handleRemove(code: string) {
    setLocalErrors(prev => prev.filter(e => e.code !== code))
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

        <PopoverSearch
          key={searchResetKey}
          selection={null}
          onSelectionChange={handleSelect}
          onClear={() => { }}
          options={availableErrors}
          getLabel={e => e.description ? `${e.code} — ${e.description}` : e.code}
          searchKey="code"
          fieldLabel="Add Error"
          fieldRequired={false}
        />

        <div className="rounded-md border flex-1 overflow-y-auto">
          {localErrors.length === 0
            ? (
              <p className="px-3 py-4 text-center text-muted-foreground">
                No errors — add at least one.
              </p>
            )
            : localErrors.map(e => {
              const description = allErrors.find(a => a.code === e.code)?.description
              return (
                <div key={e.code} className="flex items-center border-b px-3 py-2 last:border-0">
                  <div className="flex flex-1 flex-col">
                    <span className="font-medium">{e.code}</span>
                    {description && <span className="text-xs text-muted-foreground">{description}</span>}
                  </div>
                  <div className="flex w-16 justify-center">
                    <Badge asChild variant={e.is_fixed ? "success" : "destructive"}>
                      <button
                        type="button"
                        onClick={() => handleToggleFixed(e.code)}
                        className="cursor-pointer hover:opacity-80 transition-opacity"
                      >
                        {e.is_fixed ? 'Fixed' : 'Open'}
                      </button>
                    </Badge>
                  </div>
                  <div className="flex w-8 justify-center">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      type="button"
                      onClick={() => handleRemove(e.code)}
                      aria-label={`Remove error ${e.code}`}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <TrashIcon />
                    </Button>
                  </div>
                </div>
              )
            })
          }
        </div>

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
