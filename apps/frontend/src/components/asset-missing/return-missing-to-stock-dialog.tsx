import { AlertDialogDescription } from '@/components/shadcn/alert-dialog'
import { ConfirmActionDialog } from '@/components/shared/confirm-action-dialog'
import { useMissingAssetMutations } from '@/hooks/use-missing-asset-mutations'
import {
  assetNoun,
  runAssetStatusMutation,
  type AssetStatusDialogProps,
} from '@/lib/asset-status-dialog'
import { ArrowUUpLeftIcon } from '@phosphor-icons/react'

const RETURNED_TO_STOCK_TOAST = 'Returned to stock.'

export function ReturnMissingToStockDialog({
  assets,
  open,
  onOpenChange,
  onSuccess,
}: AssetStatusDialogProps): React.JSX.Element {
  const { returnToStock } = useMissingAssetMutations()
  return (
    <ConfirmActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Return ${assets.length} ${assetNoun(assets.length)} to stock?`}
      confirmLabel="Return to Stock"
      icon={<ArrowUUpLeftIcon />}
      onConfirm={() =>
        void runAssetStatusMutation(returnToStock, assets, RETURNED_TO_STOCK_TOAST, onSuccess)
      }
    >
      <AlertDialogDescription>
        The status changes from Missing back to In Stock. An asset that went missing while loading
        is also removed from its transfer.
      </AlertDialogDescription>
    </ConfirmActionDialog>
  )
}
