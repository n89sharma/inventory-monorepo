import { Button } from "@/components/shadcn/button"
import { Checkbox } from "@/components/shadcn/checkbox"
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
  const [selectedError, setSelectedError] = useState<Error | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setLocalErrors(errors.map(e => ({ code: e.code, is_fixed: e.is_fixed })))
      setSelectedError(null)
    }
  }, [open])

  if (!assetDetails) return null

  const brandId = brands.find(b => b.name === assetDetails.brand)?.id
  const localCodes = new Set(localErrors.map(e => e.code))
  const availableErrors = allErrors.filter(e => e.brand_id === brandId && !localCodes.has(e.code))

  function handleAdd() {
    if (!selectedError) return
    setLocalErrors(prev => [...prev, { code: selectedError.code, is_fixed: false }])
    setSelectedError(null)
  }

  function handleToggleFixed(code: string) {
    setLocalErrors(prev => prev.map(e => e.code === code ? { ...e, is_fixed: !e.is_fixed } : e))
  }

  function handleRemove(code: string) {
    setLocalErrors(prev => prev.filter(e => e.code !== code))
  }

  async function handleSave() {
    if (!assetDetails) return
    setSaving(true)
    const response = await updateAssetErrors(assetDetails.barcode, localErrors)
    setSaving(false)
    if (response.success) {
      toast.success('Errors updated.')
      onOpenChange(false)
    } else {
      toast.error(response.error.summary)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Edit Errors</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 items-end">
          <PopoverSearch
            selection={selectedError}
            onSelectionChange={setSelectedError}
            onClear={() => setSelectedError(null)}
            options={availableErrors}
            getLabel={e => e.description ? `${e.code} — ${e.description}` : e.code}
            searchKey="code"
            fieldLabel="Add Error"
            fieldRequired={false}
            className="flex-1"
          />
          <Button
            onClick={handleAdd}
            disabled={!selectedError}
            variant="secondary"
            type="button"
          >
            Add Error
          </Button>
        </div>

        <div className="rounded-md border">
          <div className="flex items-center border-b px-3 py-1.5 text-sm text-muted-foreground">
            <span className="flex-1">Code</span>
            <span className="w-16 text-center">Fixed?</span>
            <span className="w-8" />
          </div>
          {localErrors.length === 0
            ? (
              <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                No errors — add at least one.
              </p>
            )
            : localErrors.map(e => {
              const description = allErrors.find(a => a.code === e.code)?.description
              return (
                <div key={e.code} className="flex items-center border-b px-3 py-2 text-sm last:border-0">
                  <div className="flex flex-1 flex-col">
                    <span className="font-medium">{e.code}</span>
                    {description && <span className="text-xs text-muted-foreground">{description}</span>}
                  </div>
                  <div className="flex w-16 justify-center">
                    <Checkbox
                      checked={e.is_fixed}
                      onCheckedChange={() => handleToggleFixed(e.code)}
                    />
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
          <Button variant="outline" onClick={() => onOpenChange(false)} type="button">
            Cancel
          </Button>
          <Button onClick={handleSave} type="button" disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
