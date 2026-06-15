import { AssetTypeFilter } from '@/components/filters/asset-type-filter'
import { BrandFilter } from '@/components/filters/brand-filter'
import { CassettesFilter } from '@/components/filters/cassettes-filter'
import { InternalFinisherFilter } from '@/components/filters/internal-finisher-filter'
import { MeterRangeInput } from '@/components/filters/meter-range-input'
import { ModelFilter } from '@/components/filters/model-filter'
import { ReadinessFilter } from '@/components/filters/readiness-filter'
import { WarehouseFilter } from '@/components/filters/warehouse-filter'
import type { SharedAssetFilters } from '@/lib/asset-filter-params'
import type { AssetType, Brand } from 'shared-types'

type BrowseFilters = SharedAssetFilters & {
  brand: Brand | null
  assetTypes: AssetType[]
}

export function AssetBrowseFilters<T extends BrowseFilters>({
  draft,
  onImmediate,
  onDebounced,
  children,
}: {
  draft: T
  onImmediate: (next: T) => void
  onDebounced: (next: T) => void
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <>
      <WarehouseFilter
        selection={draft.warehouses}
        onSelectionChange={w => onImmediate({ ...draft, warehouses: w })}
      />

      <ModelFilter
        selection={draft.model}
        query={draft.modelQuery ?? ''}
        onSelectionChange={m => onImmediate({
          ...draft, model: m, modelQuery: null,
        })}
        onQueryChange={text => onDebounced({
          ...draft,
          modelQuery: text.length > 0 ? text : null,
          model: null,
        })}
        onClear={() => onImmediate({
          ...draft, model: null, modelQuery: null,
        })}
      />

      <BrandFilter
        selection={draft.brand}
        onSelectionChange={b => onImmediate({ ...draft, brand: b })}
        onClear={() => onImmediate({ ...draft, brand: null })}
      />

      <AssetTypeFilter
        selection={draft.assetTypes}
        onSelectionChange={a => onDebounced({ ...draft, assetTypes: a })}
      />

      {children}

      <ReadinessFilter
        selection={draft.readinesses}
        onSelectionChange={s => onDebounced({ ...draft, readinesses: s })}
      />

      <MeterRangeInput
        min={draft.meterMin}
        max={draft.meterMax}
        onMinChange={val => onDebounced({ ...draft, meterMin: val })}
        onMaxChange={val => onDebounced({ ...draft, meterMax: val })}
        className='w-72'
      />

      <CassettesFilter
        value={draft.cassettes}
        onValueChange={val => onDebounced({ ...draft, cassettes: val })}
      />

      <InternalFinisherFilter
        selection={draft.internalFinisher}
        onSelectionChange={c => onImmediate({ ...draft, internalFinisher: c })}
        onClear={() => onImmediate({ ...draft, internalFinisher: null })}
      />
    </>
  )
}
