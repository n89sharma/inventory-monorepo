import type { AssetSummary } from 'shared-types'
import { AddAssetsByBarcodeOrSerial } from './add-assets-by-barcode-or-serial'

const ADD_PREFIX_LABEL = 'Add Asset'

interface AddAssetBarProps {
  existingAssets: { id: number; barcode: string }[]
  entityName: string
  onAddSingle: (asset: AssetSummary) => Promise<void>
  validateAsset?: (asset: AssetSummary) => string | null
}

export function AddAssetBar({
  existingAssets,
  entityName,
  onAddSingle,
  validateAsset,
}: AddAssetBarProps): React.JSX.Element {
  return (
    <div className="flex items-center gap-2">
      <AddAssetsByBarcodeOrSerial
        getAssets={() => existingAssets}
        onAddAsset={() => {}}
        entityName={entityName}
        showLeadingIcon
        prefixLabel={ADD_PREFIX_LABEL}
        autoFocus
        validateAsset={validateAsset}
        onCommit={onAddSingle}
        className="w-72"
        inputClassName="h-7 bg-background"
      />
    </div>
  )
}
