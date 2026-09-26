import { AlertDialogDescription } from '@/components/shadcn/alert-dialog'
import { ConfirmActionDialog } from '@/components/shared/confirm-action-dialog'
import { useAssetHarvestMutations, type HarvestTarget } from '@/hooks/use-asset-harvest-mutations'
import { ArrowUUpLeftIcon, WrenchIcon } from '@phosphor-icons/react'
import { toast } from 'sonner'

const HARVESTED_TOAST = 'Marked harvested.'
const RETURNED_TO_STOCK_TOAST = 'Returned to stock.'

type HarvestDialogProps = {
  assets: HarvestTarget[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

const assetNoun = (count: number) => (count === 1 ? 'asset' : 'assets')

async function runHarvestMutation(
  mutation: (assets: HarvestTarget[]) => Promise<void>,
  assets: HarvestTarget[],
  successMessage: string,
  onSuccess: (() => void) | undefined,
) {
  try {
    await mutation(assets)
    toast.success(successMessage, { position: 'top-center' })
    onSuccess?.()
  } catch {
    // interceptor already showed the error toast
  }
}

export function HarvestAssetsDialog({
  assets,
  open,
  onOpenChange,
  onSuccess,
}: HarvestDialogProps): React.JSX.Element {
  const { harvest } = useAssetHarvestMutations()
  return (
    <ConfirmActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Mark ${assets.length} ${assetNoun(assets.length)} harvested?`}
      confirmLabel="Mark Harvested"
      icon={<WrenchIcon />}
      onConfirm={() => void runHarvestMutation(harvest, assets, HARVESTED_TOAST, onSuccess)}
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
}: HarvestDialogProps): React.JSX.Element {
  const { returnToStock } = useAssetHarvestMutations()
  return (
    <ConfirmActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Return ${assets.length} ${assetNoun(assets.length)} to stock?`}
      confirmLabel="Return to Stock"
      icon={<ArrowUUpLeftIcon />}
      onConfirm={() =>
        void runHarvestMutation(returnToStock, assets, RETURNED_TO_STOCK_TOAST, onSuccess)
      }
    >
      <AlertDialogDescription>
        The status changes from Harvested back to In Stock.
      </AlertDialogDescription>
    </ConfirmActionDialog>
  )
}
