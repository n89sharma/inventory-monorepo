import { AlertDialogDescription } from '@/components/shadcn/alert-dialog'
import { ConfirmActionDialog } from '@/components/shared/confirm-action-dialog'
import { useAssetHarvestMutations } from '@/hooks/use-asset-harvest-mutations'
import {
  assetNoun,
  runAssetStatusMutation,
  type AssetStatusDialogProps,
} from '@/lib/asset-status-dialog'
import { ArrowUUpLeftIcon, WrenchIcon } from '@phosphor-icons/react'

const HARVESTED_TOAST = 'Marked harvested.'
const RETURNED_TO_STOCK_TOAST = 'Returned to stock.'

export function HarvestAssetsDialog({
  assets,
  open,
  onOpenChange,
  onSuccess,
}: AssetStatusDialogProps): React.JSX.Element {
  const { harvest } = useAssetHarvestMutations()
  return (
    <ConfirmActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Mark ${assets.length} ${assetNoun(assets.length)} harvested?`}
      confirmLabel="Mark Harvested"
      icon={<WrenchIcon />}
      onConfirm={() => void runAssetStatusMutation(harvest, assets, HARVESTED_TOAST, onSuccess)}
    >
      <AlertDialogDescription>
        The status changes to Harvested. {assets.length === 1 ? 'It stays' : 'They stay'} in the
        warehouse for parts and can be returned to stock from the Harvested page.
      </AlertDialogDescription>
    </ConfirmActionDialog>
  )
}

export function ReturnHarvestedToStockDialog({
  assets,
  open,
  onOpenChange,
  onSuccess,
}: AssetStatusDialogProps): React.JSX.Element {
  const { returnToStock } = useAssetHarvestMutations()
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
        The status changes from Harvested back to In Stock.
      </AlertDialogDescription>
    </ConfirmActionDialog>
  )
}
