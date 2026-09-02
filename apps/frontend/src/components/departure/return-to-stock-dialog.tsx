import { AlertDialogDescription } from '@/components/shadcn/alert-dialog'
import { ConfirmActionDialog } from '@/components/shared/confirm-action-dialog'
import { ArrowUUpLeftIcon } from '@phosphor-icons/react'

type ReturnToStockDialogProps = {
  assetCount: number
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function ReturnToStockDialog({
  assetCount,
  open,
  onOpenChange,
  onConfirm,
}: ReturnToStockDialogProps): React.JSX.Element {
  return (
    <ConfirmActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Return ${assetCount} asset${assetCount !== 1 ? 's' : ''} to stock?`}
      confirmLabel="Return to Stock"
      confirmVariant="destructive"
      icon={<ArrowUUpLeftIcon />}
      onConfirm={onConfirm}
    >
      <AlertDialogDescription>
        The status changes to In Stock. {assetCount === 1 ? 'The asset leaves' : 'The assets leave'}{' '}
        this departure and any sales invoice, and the sale price is cleared. This cannot be undone.
      </AlertDialogDescription>
    </ConfirmActionDialog>
  )
}
