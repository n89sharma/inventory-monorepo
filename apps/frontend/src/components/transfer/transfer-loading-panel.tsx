import { ScanSplitView } from '@/components/shared/scan-split-view'
import { useTransferMutations } from '@/hooks/use-transfer-mutations'
import { ASSET_STATUS, type TransferAssetRow } from 'shared-types'

const PENDING_LABEL = 'Pending'
const RESOLVED_LABEL = 'Loaded'
const READY_STATUS_MESSAGE = 'All assets loaded. Transfer can depart.'

function pendingStatusMessage(remaining: number): string {
  const noun = remaining === 1 ? 'asset' : 'assets'
  return `Transfer can depart after loading the remaining ${remaining} ${noun}`
}

interface TransferLoadingPanelProps {
  transferNumber: string
  assets: TransferAssetRow[]
  focusKey: number
}

export function TransferLoadingPanel({
  transferNumber,
  assets,
  focusKey,
}: TransferLoadingPanelProps): React.JSX.Element {
  const mutations = useTransferMutations()

  // Missing-at-load assets never travel, so they never leave the Pending pane (tinted amber),
  // but they don't block Depart either — the remaining count excludes them.
  const pendingAssets = assets.filter((asset) => !asset.scan.loaded)
  const resolvedAssets = assets.filter((asset) => asset.scan.loaded)
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
      actionLabel="Load"
      undoLabel="Unload"
      remainingCount={remainingCount}
      pendingStatusMessage={pendingStatusMessage}
      readyStatusMessage={READY_STATUS_MESSAGE}
      focusKey={focusKey}
      onScan={(assetId) =>
        mutations.scanLoaded(transferNumber, assetId, barcodeOf(assets, assetId))
      }
      onMarkMissing={(assetId) =>
        mutations.markMissingAtLoad(transferNumber, assetId, barcodeOf(assets, assetId))
      }
      onUndo={(assetId) => mutations.undoLoad(transferNumber, assetId, barcodeOf(assets, assetId))}
    />
  )
}

function barcodeOf(assets: TransferAssetRow[], assetId: number): string {
  const asset = assets.find((a) => a.id === assetId)
  if (!asset) throw new Error(`Asset ${assetId} not found on this transfer`)
  return asset.barcode
}
