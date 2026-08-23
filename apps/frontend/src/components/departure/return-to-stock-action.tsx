import { AlertDialogDescription } from '@/components/shadcn/alert-dialog'
import { Button } from '@/components/shadcn/button'
import { ConfirmActionDialog } from '@/components/shared/confirm-action-dialog'
import { useCan } from '@/hooks/use-can'
import { ArrowUUpLeftIcon } from '@phosphor-icons/react'
import { useState } from 'react'

type ReturnToStockActionProps = {
  assetCount: number
  onConfirm: () => void
}

export function ReturnToStockAction({
  assetCount,
  onConfirm,
}: ReturnToStockActionProps): React.ReactNode {
  const canReturnToStock = useCan('return_to_stock')
  const [open, setOpen] = useState(false)
  if (!canReturnToStock) return null

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <ArrowUUpLeftIcon />
        Return to Stock
      </Button>
      <ConfirmActionDialog
        open={open}
        onOpenChange={setOpen}
        title={`Return ${assetCount} asset${assetCount !== 1 ? 's' : ''} to stock?`}
        confirmLabel="Return to Stock"
        confirmVariant="destructive"
        icon={<ArrowUUpLeftIcon />}
        onConfirm={onConfirm}
      >
        <AlertDialogDescription>
          The status changes to In Stock. The asset{assetCount !== 1 ? 's' : ''} leave this
          departure and any sales invoice, and the sale price is cleared. This cannot be undone.
        </AlertDialogDescription>
      </ConfirmActionDialog>
    </>
  )
}
