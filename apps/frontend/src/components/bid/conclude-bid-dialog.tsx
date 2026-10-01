import { Button } from '@/components/shadcn/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/shadcn/dialog'
import { ToggleGroup, ToggleGroupItem } from '@/components/shadcn/toggle-group'
import { SpinnerGapIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { BID_OUTCOME, BidOutcomeSchema, type BidOutcome } from 'shared-types'

const OUTCOME_OPTIONS = [
  {
    value: BID_OUTCOME.WON,
    label: 'Won',
    className: 'data-[state=on]:bg-emerald-600 data-[state=on]:text-white',
  },
  {
    value: BID_OUTCOME.LOST,
    label: 'Lost',
    className: 'data-[state=on]:bg-destructive data-[state=on]:text-white',
  },
] as const

interface ConcludeBidDialogProps {
  onConclude: (outcome: BidOutcome) => Promise<void>
}

export function ConcludeBidDialog({ onConclude }: ConcludeBidDialogProps): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [outcome, setOutcome] = useState<BidOutcome>(BID_OUTCOME.WON)
  const [saving, setSaving] = useState(false)

  function handleOpenChange(newOpen: boolean) {
    setOpen(newOpen)
    if (!newOpen) setOutcome(BID_OUTCOME.WON)
  }

  function handleOutcomeChange(value: string) {
    const parsed = BidOutcomeSchema.safeParse(value)
    if (parsed.success) setOutcome(parsed.data)
  }

  async function confirm() {
    setSaving(true)
    try {
      await onConclude(outcome)
      handleOpenChange(false)
    } catch {
      // interceptor surfaced the error toast — keep the dialog open
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={saving ? undefined : handleOpenChange}>
      <DialogTrigger asChild>
        <Button>Won/Lost</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record the vendor's decision</DialogTitle>
          <DialogDescription>
            The bid is concluded and can't be changed afterwards.
          </DialogDescription>
        </DialogHeader>
        <ToggleGroup
          type="single"
          value={outcome}
          onValueChange={handleOutcomeChange}
          variant="outline"
          aria-label="Outcome"
        >
          {OUTCOME_OPTIONS.map((option) => (
            <ToggleGroupItem
              key={option.value}
              value={option.value}
              className={`flex-1 ${option.className}`}
            >
              {option.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <DialogFooter>
          <Button
            variant="outline"
            type="button"
            onClick={() => handleOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button type="button" onClick={confirm} disabled={saving}>
            {saving && <SpinnerGapIcon className="animate-spin" />}
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
