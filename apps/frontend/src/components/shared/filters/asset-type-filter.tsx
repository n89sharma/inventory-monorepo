import { MultiSelectOptionsInline } from '@/components/shared/search-select/multi-select-options'
import { useAssetTypes } from '@/hooks/use-reference-data'
import type { AssetType } from 'shared-types'

export function AssetTypeFilter({
  selection,
  onSelectionChange,
}: {
  selection: AssetType[]
  onSelectionChange: (assetTypes: AssetType[]) => void
}): React.JSX.Element {
  const allAssetTypes = useAssetTypes()

  return (
    <MultiSelectOptionsInline
      selection={selection}
      onSelectionChange={onSelectionChange}
      options={allAssetTypes}
      getLabel={(a) => a.asset_type}
      fieldLabel="Asset Type"
      className="w-35"
    />
  )
}
