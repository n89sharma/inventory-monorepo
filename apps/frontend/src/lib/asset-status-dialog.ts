import type { AssetStatusTarget } from '@/hooks/use-asset-harvest-mutations'
import { toast } from 'sonner'

export type AssetStatusDialogProps = {
  assets: AssetStatusTarget[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export const assetNoun = (count: number) => (count === 1 ? 'asset' : 'assets')

export async function runAssetStatusMutation(
  mutation: (assets: AssetStatusTarget[]) => Promise<void>,
  assets: AssetStatusTarget[],
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
