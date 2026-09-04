import { useArrivalMutations } from '@/hooks/use-arrival-mutations'
import { useOrgs } from '@/hooks/use-org'
import { DISCARD_USER_EDITS, KEEP_USER_EDITS_ON_SERVER_REFRESH } from '@/lib/form-reset-options'
import { flattenFieldErrors } from '@/lib/utils'
import { SplitArrivalFormSchema, type SplitArrivalForm } from '@/ui-types/arrival-form-types'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useState } from 'react'
import { Controller, useForm, type FieldErrors } from 'react-hook-form'
import type { AssetIdentity, OrgSummary } from 'shared-types'
import { toast } from 'sonner'
import { Button } from '../shadcn/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../shadcn/dialog'
import { Field, FieldGroup, FieldLabel } from '../shadcn/field'
import { Textarea } from '../shadcn/textarea'
import { ControlledSearchSelectInput } from '../shared/search-select/controlled-search-select-input'

interface SplitArrivalModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sourceArrivalNumber: string
  sourceWarehouseCode: string | null
  sourceTransporter: OrgSummary | null
  selectedAssets: AssetIdentity[]
  onConfirmSuccess: () => void
}

export function SplitArrivalModal({
  open,
  onOpenChange,
  sourceArrivalNumber,
  sourceWarehouseCode,
  sourceTransporter,
  selectedAssets,
  onConfirmSuccess,
}: SplitArrivalModalProps) {
  const orgs = useOrgs()
  const [isConfirming, setIsConfirming] = useState(false)

  const assetCount = selectedAssets.length
  const assetNoun = `asset${assetCount !== 1 ? 's' : ''}`

  // The truck is the same, so the new arrival keeps the source's transporter; the vendor is the
  // field being split on and starts blank.
  const values = useMemo(
    () =>
      ({ vendor: null, transporter: sourceTransporter, comment: '' }) satisfies SplitArrivalForm,
    [sourceTransporter],
  )
  const form = useForm<SplitArrivalForm>({
    resolver: zodResolver(SplitArrivalFormSchema),
    values,
    resetOptions: KEEP_USER_EDITS_ON_SERVER_REFRESH,
  })

  const arrivalMutations = useArrivalMutations()

  async function onValid(newArrival: SplitArrivalForm) {
    setIsConfirming(true)
    try {
      const arrivalNumber = await arrivalMutations.splitAssets(
        sourceArrivalNumber,
        {
          vendor: newArrival.vendor!,
          transporter: newArrival.transporter!,
          comment: newArrival.comment === '' ? null : newArrival.comment,
        },
        selectedAssets,
      )
      toast.success(`Moved ${assetCount} ${assetNoun} to new Arrival ${arrivalNumber}.`, {
        position: 'top-center',
      })
      onConfirmSuccess()
      handleOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to split the arrival', {
        position: 'top-center',
      })
      setIsConfirming(false)
    }
  }

  function onInvalid(errors: FieldErrors<SplitArrivalForm>) {
    toast.error(flattenFieldErrors(errors, []), { position: 'top-center' })
  }

  function submit() {
    form.handleSubmit(onValid, onInvalid)()
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setIsConfirming(false)
      form.reset(values, DISCARD_USER_EDITS)
    }
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Split to new arrival</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-1 rounded-md border px-3 py-2">
          <p>
            Move {assetCount} {assetNoun} from Arrival {sourceArrivalNumber} onto a new arrival
          </p>
          {sourceWarehouseCode !== null && (
            <p className="text-muted-foreground">
              Warehouse {sourceWarehouseCode}, the same as Arrival {sourceArrivalNumber}
            </p>
          )}
        </div>

        <form onSubmit={(e) => e.preventDefault()}>
          <FieldGroup className="grid grid-cols-2 gap-x-6 gap-y-3">
            <ControlledSearchSelectInput
              control={form.control}
              name="vendor"
              options={orgs}
              getLabel={(o) => o.name}
              fieldLabel="Vendor"
              fieldRequired={true}
            />
            <ControlledSearchSelectInput
              control={form.control}
              name="transporter"
              options={orgs}
              getLabel={(o) => o.name}
              fieldLabel="Transporter"
              fieldRequired={true}
            />
            <Controller
              control={form.control}
              name="comment"
              render={({ field }) => (
                <Field className="col-span-2">
                  <FieldLabel>Comments</FieldLabel>
                  <Textarea placeholder="Arrival notes…" className="resize-none" {...field} />
                </Field>
              )}
            />
          </FieldGroup>
        </form>

        <DialogFooter>
          <Button variant="outline" type="button" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={isConfirming} onClick={submit}>
            {isConfirming ? 'Splitting…' : 'Split arrival'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
