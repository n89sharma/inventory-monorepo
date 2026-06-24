import { AssetTypeFilter } from '@/components/filters/asset-type-filter'
import { BrandFilter } from '@/components/filters/brand-filter'
import type { AssetType, Brand } from 'shared-types'

type IdentityDraft = {
  brand: Brand | null
  assetTypes: AssetType[]
}

export function AssetIdentityFilters<T extends IdentityDraft>({
  draft,
  onImmediate,
  onDebounced,
}: {
  draft: T
  onImmediate: (next: T) => void
  onDebounced: (next: T) => void
}): React.JSX.Element {
  return (
    <>
      <BrandFilter
        selection={draft.brand}
        onSelectionChange={(b) => onImmediate({ ...draft, brand: b })}
        onClear={() => onImmediate({ ...draft, brand: null })}
      />

      <AssetTypeFilter
        selection={draft.assetTypes}
        onSelectionChange={(a) => onDebounced({ ...draft, assetTypes: a })}
      />
    </>
  )
}
