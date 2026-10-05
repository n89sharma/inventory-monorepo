import { AlertDialogDescription } from '@/components/shadcn/alert-dialog'
import { ConfirmActionDialog } from '@/components/shared/confirm-action-dialog'
import { useMissingAssetMutations } from '@/hooks/use-missing-asset-mutations'
import {
  assetNoun,
  runAssetStatusMutation,
  type AssetStatusDialogProps,
} from '@/lib/asset-status-dialog'
import { WarningIcon } from '@phosphor-icons/react'

const MARKED_MISSING_TOAST = 'Marked missing.'

export function MarkAssetsMissingDialog({
  assets,
  open,
  onOpenChange,
  onSuccess,
}: AssetStatusDialogProps): React.JSX.Element {
  const { markMissing } = useMissingAssetMutations()
  return (
    <ConfirmActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Mark ${assets.length} ${assetNoun(assets.length)} missing?`}
      confirmLabel="Mark Missing"
      icon={<WarningIcon />}
      onConfirm={() =>
        void runAssetStatusMutation(markMissing, assets, MARKED_MISSING_TOAST, onSuccess)
      }
    >
      <AlertDialogDescription>
        The status changes to Missing. {assets.length === 1 ? 'It leaves' : 'They leave'} on-hand
        stock and can be returned to stock from the Missing page once found.
      </AlertDialogDescription>
    </ConfirmActionDialog>
  )
}
