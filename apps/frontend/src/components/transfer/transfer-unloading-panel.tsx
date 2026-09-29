import { ScanSplitView } from '@/components/shared/scan-split-view'
import { useTransferMutations } from '@/hooks/use-transfer-mutations'
import { ASSET_STATUS, type TransferAssetRow } from 'shared-types'

const PENDING_LABEL = 'Pending'
const RESOLVED_LABEL = 'Unloaded'
const READY_STATUS_MESSAGE = 'All assets unloaded. Transfer can complete.'

function pendingStatusMessage(remaining: number): string {
  const noun = remaining === 1 ? 'asset' : 'assets'
  return `Transfer can complete after unloading the remaining ${remaining} ${noun}`
}

interface TransferUnloadingPanelProps {
  transferNumber: string
  assets: TransferAssetRow[]
  focusKey: number
}

export function TransferUnloadingPanel({
  transferNumber,
  assets,
  focusKey,
}: TransferUnloadingPanelProps): React.JSX.Element {
  const mutations = useTransferMutations()

  // Assets marked Missing at loading never rode the truck and never appear on this leg.
  // Missing-at-unload assets stay in the Pending pane (tinted amber) rather than Resolved,
  // but they don't block Complete either — the remaining count excludes them.
  const traveled = assets.filter((asset) => asset.scan.loaded)
  const pendingAssets = traveled.filter((asset) => !asset.scan.unloaded)
  const resolvedAssets = traveled.filter((asset) => asset.scan.unloaded)
  const remainingCount = pendingAssets.filter(
    (asset) => asset.status !== ASSET_STATUS.MISSING,
  ).length

  return (
    <ScanSplitView
      entityName="transfer"
      pendingAssets={pendingAssets}
      resolvedAssets={resolvedAssets}
      pendingLabel={PENDING_LABEL}
      resolvedLabel={RESOLVED_LABEL}
      actionLabel="Unload"
      undoLabel="Undo"
      remainingCount={remainingCount}
      pendingStatusMessage={pendingStatusMessage}
      readyStatusMessage={READY_STATUS_MESSAGE}
      focusKey={focusKey}
      onScan={(assetId) =>
        mutations.scanUnloaded(transferNumber, assetId, barcodeOf(traveled, assetId))
      }
      onMarkMissing={(assetId) =>
        mutations.markMissingAtUnload(transferNumber, assetId, barcodeOf(traveled, assetId))
      }
      onUndo={(assetId) =>
        mutations.undoUnload(transferNumber, assetId, barcodeOf(traveled, assetId))
      }
    />
  )
}

function barcodeOf(assets: TransferAssetRow[], assetId: number): string {
  const asset = assets.find((a) => a.id === assetId)
  if (!asset) throw new Error(`Asset ${assetId} not found on this transfer`)
  return asset.barcode
}
