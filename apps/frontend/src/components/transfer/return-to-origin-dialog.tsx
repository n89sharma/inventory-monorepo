import { AlertDialogDescription } from '@/components/shadcn/alert-dialog'
import { ConfirmActionDialog } from '@/components/shared/confirm-action-dialog'
import { ArrowUUpLeftIcon } from '@phosphor-icons/react'

type ReturnToOriginDialogProps = {
  assetCount: number
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function ReturnToOriginDialog({
  assetCount,
  open,
  onOpenChange,
  onConfirm,
}: ReturnToOriginDialogProps): React.JSX.Element {
  return (
    <ConfirmActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Return ${assetCount} asset${assetCount !== 1 ? 's' : ''} to origin?`}
      confirmLabel="Return to Origin"
      confirmVariant="destructive"
      icon={<ArrowUUpLeftIcon />}
      onConfirm={onConfirm}
    >
      <AlertDialogDescription>
        {assetCount === 1 ? 'The asset returns' : 'The assets return'} to the origin warehouse's
        Shipping &amp; Receiving and {assetCount === 1 ? 'leaves' : 'leave'} this transfer. Costs
        added at dispatch are not reversed and must be adjusted manually. This cannot be undone.
      </AlertDialogDescription>
    </ConfirmActionDialog>
  )
}
