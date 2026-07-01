import type { AssetSummary } from 'shared-types'
import { AddAssetBarShell } from './add-asset-bar-shell'
import { AddAssetsByBarcodeOrSerial, AddFromHoldButton } from './add-assets-to-create-form'

interface AddAssetBarProps {
  existingAssets: AssetSummary[]
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
    <AddAssetBarShell label="Add asset">
      <AddAssetsByBarcodeOrSerial
        getAssets={() => existingAssets}
        onAddAsset={() => {}}
        entityName={entityName}
        showLeadingIcon
        validateAsset={validateAsset}
        onCommit={onAddSingle}
        className="w-96"
      />
      {onAddBatchFromHold && (
        <div className="ml-auto">
          <AddFromHoldButton
            getAssets={() => existingAssets}
            onAddAsset={() => {}}
            onCommitBatch={onAddBatchFromHold}
          />
        </div>
      )}
    </AddAssetBarShell>
  )
}
