import { AssetTypeFilter } from '@/components/shared/filters/asset-type-filter'
import { BrandFilter } from '@/components/shared/filters/brand-filter'
import { CassettesFilter } from '@/components/shared/filters/cassettes-filter'
import { InternalFinisherFilter } from '@/components/shared/filters/internal-finisher-filter'
import { MeterRangeInput } from '@/components/shared/filters/meter-range-input'
import { ModelsFilter } from '@/components/shared/filters/models-filter'
import { ReadinessFilter } from '@/components/shared/filters/readiness-filter'
import { FilterRow } from '@/components/shared/filter-row'
import {
  useAssetTypesParam,
  useBrandParam,
  useCassettesParam,
  useInternalFinisherParam,
  useMeterRangeParam,
  useModelsParam,
  useReadinessesParam,
} from '@/lib/filters/hooks'
import { memo } from 'react'

const DEFAULT_MODEL_PLACEHOLDER = 'Model'

// Memoised so a URL write for something the bar does not own, such as the grid's sort,
// stops here instead of re-rendering every control and popover below it.
export const AssetFilterBar = memo(function AssetFilterBar({
  scopeFilters,
  modelPlaceholder = DEFAULT_MODEL_PLACEHOLDER,
}: {
  scopeFilters?: React.ReactNode
  modelPlaceholder?: string
}): React.JSX.Element {
  const [brand, setBrand] = useBrandParam()
  const [assetTypes, setAssetTypes] = useAssetTypesParam()
  const { models, modelQuery, setModels, setModelQuery, clear } = useModelsParam()
  const [readinesses, setReadinesses] = useReadinessesParam()
  const { min, max, setMin, setMax } = useMeterRangeParam()
  const [cassettes, setCassettes] = useCassettesParam()
  const [internalFinisher, setInternalFinisher] = useInternalFinisherParam()

  return (
    <>
      <FilterRow>{scopeFilters}</FilterRow>

      <FilterRow>
        <BrandFilter
          selection={brand}
          onSelectionChange={setBrand}
          onClear={() => setBrand(null)}
        />

        <AssetTypeFilter selection={assetTypes} onSelectionChange={setAssetTypes} />

        <ModelsFilter
          selection={models}
          query={modelQuery}
          onSelectionChange={setModels}
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
          className="w-56"
        />

        <CassettesFilter value={cassettes} onValueChange={setCassettes} />

        <InternalFinisherFilter
          selection={internalFinisher}
          onSelectionChange={setInternalFinisher}
          onClear={() => setInternalFinisher(null)}
        />
      </FilterRow>
    </>
  )
})
