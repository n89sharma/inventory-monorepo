import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/shadcn/alert-dialog'
import { Button } from '@/components/shadcn/button'
import { useCan } from '@/hooks/use-can'
import { SpinnerGapIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { TRANSFER_STATUS } from 'shared-types'

type LifecycleButtonProps = {
  label: string
  title: string
  description: string
  onConfirm: () => Promise<void>
}

function LifecycleButton({
  label,
  title,
  description,
  onConfirm,
}: LifecycleButtonProps): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleConfirm() {
    setLoading(true)
    try {
      await onConfirm()
      setOpen(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button>{label}</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <Button onClick={handleConfirm} disabled={loading}>
            {loading ? <SpinnerGapIcon className="animate-spin" /> : null}
            {label}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

type TransferLifecycleActionsProps = {
  status: string
  assetCount: number
  onDispatch: () => Promise<void>
  onReceive: () => Promise<void>
}

export function TransferLifecycleActions({
  status,
  assetCount,
  onDispatch,
  onReceive,
}: TransferLifecycleActionsProps): React.JSX.Element | null {
  const canCreateEditTransfer = useCan('create_update_transfer')
  if (!canCreateEditTransfer) return null

  if (status === TRANSFER_STATUS.DRAFT) {
    return (
      <LifecycleButton
        label="Dispatch"
        title="Dispatch this transfer?"
        description={`This marks ${assetCount} machine(s) as in transit and clears their location. The transfer can't be edited after dispatch.`}
        onConfirm={onDispatch}
      />
    )
  }

  if (status === TRANSFER_STATUS.IN_TRANSIT) {
    return (
      <LifecycleButton
        label="Complete"
        title="Mark this transfer as received?"
        description={`This receives ${assetCount} machine(s) into the destination's shipping & receiving and completes the transfer.`}
        onConfirm={onReceive}
      />
    )
  }

  return null
}
