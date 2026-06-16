import { MultiSelectOptionsInline } from '@/components/custom/multi-select-options'
import { useReferenceDataStore } from '@/data/store/reference-data-store'
import { assetTypeLabel } from '@/lib/reference-labels'
import type { AssetType } from 'shared-types'

export function AssetTypeFilter({
  selection,
  onSelectionChange,
}: {
  selection: AssetType[]
  onSelectionChange: (assetTypes: AssetType[]) => void
}): React.JSX.Element {
  const allAssetTypes = useReferenceDataStore(state => state.assetTypes)

  return (
    <MultiSelectOptionsInline
      selection={selection}
      onSelectionChange={onSelectionChange}
      options={allAssetTypes}
      getLabel={assetTypeLabel}
      fieldLabel='Asset Type'
      className='w-35'
    />
  )
}
