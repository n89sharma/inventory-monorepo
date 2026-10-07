import { Button } from '@/components/shadcn/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/shadcn/dialog'
import { PercentInput } from '@/components/shared/percent-input'
import { PriceInput } from '@/components/shared/price-input'
import { SpinnerGapIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { BidMarginPercentSchema } from 'shared-types'

interface SetBidRowsValueDialogProps {
  onOpenChange: (open: boolean) => void
  title: string
  rowCount: number
  canSave: boolean
  onSave: () => Promise<void>
  children: React.ReactNode
}

function SetBidRowsValueDialog({
  onOpenChange,
  title,
  rowCount,
  canSave,
  onSave,
  children,
}: SetBidRowsValueDialogProps): React.JSX.Element {
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    try {
      await onSave()
      onOpenChange(false)
    } catch {
      // interceptor surfaced the error toast — keep the dialog open
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={saving ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Applies to {rowCount} selected row{rowCount !== 1 ? 's' : ''}.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            if (canSave && !saving) void save()
          }}
        >
          {children}
        </form>
        <DialogFooter>
          <Button
            variant="outline"
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button type="button" onClick={save} disabled={saving || !canSave}>
            {saving && <SpinnerGapIcon className="animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface SetBidRowsAmountDialogProps {
  onOpenChange: (open: boolean) => void
  rowCount: number
  onApply: (value: number) => Promise<void>
}

export function SetBidRowsMarginDialog({
  onOpenChange,
  rowCount,
  onApply,
}: SetBidRowsAmountDialogProps): React.JSX.Element {
  const [value, setValue] = useState('')
  const margin = BidMarginPercentSchema.safeParse(parseFloat(value))
  const invalid = value !== '' && !margin.success
  return (
    <SetBidRowsValueDialog
      onOpenChange={onOpenChange}
      title="Set margin"
      rowCount={rowCount}
      canSave={margin.success}
      onSave={() => (margin.success ? onApply(margin.data) : Promise.resolve())}
    >
      <PercentInput autoFocus label="Margin" value={value} onChange={setValue} invalid={invalid} />
    </SetBidRowsValueDialog>
  )
}

function SetBidRowsPriceDialog({
  onOpenChange,
  title,
  label,
  rowCount,
  onApply,
}: SetBidRowsAmountDialogProps & { title: string; label: string }): React.JSX.Element {
  const [value, setValue] = useState('')
  const price = parseFloat(value)
  const valid = !Number.isNaN(price)
  return (
    <SetBidRowsValueDialog
      onOpenChange={onOpenChange}
      title={title}
      rowCount={rowCount}
      canSave={valid}
      onSave={() => (valid ? onApply(price) : Promise.resolve())}
    >
      <PriceInput autoFocus label={label} value={value} onChange={setValue} />
    </SetBidRowsValueDialog>
  )
}

export function SetBidRowsFreightDialog(props: SetBidRowsAmountDialogProps): React.JSX.Element {
  return <SetBidRowsPriceDialog {...props} title="Set freight" label="Freight" />
}

export function SetBidRowsSellingPriceDialog(
  props: SetBidRowsAmountDialogProps,
): React.JSX.Element {
  return <SetBidRowsPriceDialog {...props} title="Set selling price" label="Selling Price" />
}
