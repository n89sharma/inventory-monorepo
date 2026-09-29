import { ScanSplitView } from '@/components/shared/scan-split-view'
import { useDepartureMutations } from '@/hooks/use-departure-mutations'
import { ASSET_STATUS, type DepartureAssetRow } from 'shared-types'

const PENDING_LABEL = 'Pending'
const RESOLVED_LABEL = 'Loaded'
const READY_STATUS_MESSAGE = 'All assets loaded. Departure can finish loading.'

function pendingStatusMessage(remaining: number): string {
  const noun = remaining === 1 ? 'asset' : 'assets'
  return `Departure can finish after loading the remaining ${remaining} ${noun}`
}

interface DepartureLoadingPanelProps {
  departureNumber: string
  assets: DepartureAssetRow[]
  focusKey: number
}

export function DepartureLoadingPanel({
  departureNumber,
  assets,
  focusKey,
}: DepartureLoadingPanelProps): React.JSX.Element {
  const mutations = useDepartureMutations()

  // Missing assets stay in the Pending pane (tinted amber) but don't block finishing loading,
  // so the remaining count excludes them.
  const pendingAssets = assets.filter((asset) => !asset.scan.loaded)
  const resolvedAssets = assets.filter((asset) => asset.scan.loaded)
  const remainingCount = pendingAssets.filter(
    (asset) => asset.status !== ASSET_STATUS.MISSING,
  ).length

  return (
    <ScanSplitView
      entityName="departure"
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
        mutations.scanLoaded(departureNumber, assetId, barcodeOf(assets, assetId))
      }
      onMarkMissing={(assetId) =>
        mutations.markMissingAtLoad(departureNumber, assetId, barcodeOf(assets, assetId))
      }
      onUndo={(assetId) => mutations.undoLoad(departureNumber, assetId, barcodeOf(assets, assetId))}
    />
  )
}

function barcodeOf(assets: DepartureAssetRow[], assetId: number): string {
  const asset = assets.find((a) => a.id === assetId)
  if (!asset) throw new Error(`Asset ${assetId} not found on this departure`)
  return asset.barcode
}
