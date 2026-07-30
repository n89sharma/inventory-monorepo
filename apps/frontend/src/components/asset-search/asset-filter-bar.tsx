import { AssetTypeFilter } from '@/components/shared/filters/asset-type-filter'
import { BrandFilter } from '@/components/shared/filters/brand-filter'
import { CassettesFilter } from '@/components/shared/filters/cassettes-filter'
import { InternalFinisherFilter } from '@/components/shared/filters/internal-finisher-filter'
import { MeterRangeInput } from '@/components/shared/filters/meter-range-input'
import { ModelFilter } from '@/components/shared/filters/model-filter'
import { ReadinessFilter } from '@/components/shared/filters/readiness-filter'
import { ActiveFilterBar } from '@/components/shared/active-filter-bar'
import {
  useActiveFilters,
  useAssetTypesParam,
  useBrandParam,
  useCassettesParam,
  useInternalFinisherParam,
  useMeterRangeParam,
  useModelParam,
  useReadinessesParam,
  type FilterParamGroups,
} from '@/lib/filters/hooks'
import { useMemo } from 'react'

const DEFAULT_MODEL_PLACEHOLDER = 'Model'

// The controls this bar renders itself; each page adds its own scope filters.
const ASSET_FILTER_GROUPS = [
  ['brand'],
  ['type'],
  ['model', 'q'],
  ['readiness'],
  ['meter_min', 'meter_max'],
  ['cas'],
  ['fin'],
] as const satisfies FilterParamGroups

export function AssetFilterBar({
  scopeFilters,
  scopeFilterGroups,
  modelPlaceholder = DEFAULT_MODEL_PLACEHOLDER,
}: {
  scopeFilters?: React.ReactNode
  scopeFilterGroups: FilterParamGroups
  modelPlaceholder?: string
}): React.JSX.Element {
  const [brand, setBrand] = useBrandParam()
  const [assetTypes, setAssetTypes] = useAssetTypesParam()
  const { model, modelQuery, setModel, setModelQuery, clear } = useModelParam()
  const [readinesses, setReadinesses] = useReadinessesParam()
  const { min, max, setMin, setMax } = useMeterRangeParam()
  const [cassettes, setCassettes] = useCassettesParam()
  const [internalFinisher, setInternalFinisher] = useInternalFinisherParam()
  const filterGroups = useMemo(
    () => [...scopeFilterGroups, ...ASSET_FILTER_GROUPS],
    [scopeFilterGroups],
  )
  const { count, clearAll } = useActiveFilters(filterGroups)

  return (
    <>
      <div className="flex flex-row flex-wrap gap-2 items-end">{scopeFilters}</div>

      <div className="flex flex-row flex-wrap gap-2 items-end">
        <BrandFilter
          selection={brand}
          onSelectionChange={setBrand}
          onClear={() => setBrand(null)}
        />

        <AssetTypeFilter selection={assetTypes} onSelectionChange={setAssetTypes} />

        <ModelFilter
          selection={model}
          query={modelQuery}
          onSelectionChange={setModel}
          onQueryChange={setModelQuery}
          onClear={clear}
          placeholder={modelPlaceholder}
        />

        <ReadinessFilter selection={readinesses} onSelectionChange={setReadinesses} />

        <MeterRangeInput
          min={min}
          max={max}
          onMinChange={setMin}
          onMaxChange={setMax}
          className="w-72"
        />

        <CassettesFilter value={cassettes} onValueChange={setCassettes} />

        <InternalFinisherFilter
          selection={internalFinisher}
          onSelectionChange={setInternalFinisher}
          onClear={() => setInternalFinisher(null)}
        />
      </div>

      {count > 0 ? <ActiveFilterBar count={count} onClear={clearAll} /> : null}
    </>
  )
}
