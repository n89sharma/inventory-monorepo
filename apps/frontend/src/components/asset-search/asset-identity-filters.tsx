import { AssetTypeFilter } from '@/components/shared/filters/asset-type-filter'
import { BrandFilter } from '@/components/shared/filters/brand-filter'
import { useAssetTypesParam, useBrandParam } from '@/lib/filters/hooks'

export function AssetIdentityFilters(): React.JSX.Element {
  const [brand, setBrand] = useBrandParam()
  const [assetTypes, setAssetTypes] = useAssetTypesParam()
  return (
    <>
      <BrandFilter selection={brand} onSelectionChange={setBrand} onClear={() => setBrand(null)} />

      <AssetTypeFilter selection={assetTypes} onSelectionChange={setAssetTypes} />
    </>
  )
}
