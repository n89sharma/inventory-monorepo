import type { AssetSummary } from 'shared-types'
import { AddAssetsByBarcodeOrSerial } from './add-assets-by-barcode-or-serial'
import { AddFromHoldButton } from './add-from-hold-button'

interface AddAssetBarProps {
  existingAssets: { id: number; barcode: string }[]
  entityName: string
  onAddSingle: (asset: AssetSummary) => Promise<void>
  onAddBatchFromHold?: (assets: AssetSummary[]) => Promise<void>
  validateAsset?: (asset: AssetSummary) => string | null
}

export function AddAssetBar({
  existingAssets,
  entityName,
  onAddSingle,
  onAddBatchFromHold,
  validateAsset,
}: AddAssetBarProps): React.JSX.Element {
  return (
    <div className="flex items-center gap-2">
      <AddAssetsByBarcodeOrSerial
        getAssets={() => existingAssets}
        onAddAsset={() => {}}
        entityName={entityName}
        showLeadingIcon
        validateAsset={validateAsset}
        onCommit={onAddSingle}
        className="w-72"
        inputClassName="bg-background"
      />
      {onAddBatchFromHold && (
        <AddFromHoldButton
          getAssets={() => existingAssets}
          onAddAsset={() => {}}
          onCommitBatch={onAddBatchFromHold}
        />
      )}
    </div>
  )
}
