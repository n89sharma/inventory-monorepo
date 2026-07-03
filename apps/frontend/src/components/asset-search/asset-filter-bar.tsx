import { AssetTypeFilter } from '@/components/shared/filters/asset-type-filter'
import { BrandFilter } from '@/components/shared/filters/brand-filter'
import { CassettesFilter } from '@/components/shared/filters/cassettes-filter'
import { InternalFinisherFilter } from '@/components/shared/filters/internal-finisher-filter'
import { MeterRangeInput } from '@/components/shared/filters/meter-range-input'
import { ModelFilter } from '@/components/shared/filters/model-filter'
import { ReadinessFilter } from '@/components/shared/filters/readiness-filter'
import {
  useAssetTypesParam,
  useBrandParam,
  useCassettesParam,
  useInternalFinisherParam,
  useMeterRangeParam,
  useModelParam,
  useReadinessesParam,
} from '@/lib/filters/hooks'

const DEFAULT_MODEL_PLACEHOLDER = 'Model'

export function AssetFilterBar({
  scopeFilters,
  modelPlaceholder = DEFAULT_MODEL_PLACEHOLDER,
}: {
  scopeFilters?: React.ReactNode
  modelPlaceholder?: string
}): React.JSX.Element {
  const [brand, setBrand] = useBrandParam()
  const [assetTypes, setAssetTypes] = useAssetTypesParam()
  const { model, modelQuery, setModel, setModelQuery, clear } = useModelParam()
  const [readinesses, setReadinesses] = useReadinessesParam()
  const { min, max, setMin, setMax } = useMeterRangeParam()
  const [cassettes, setCassettes] = useCassettesParam()
  const [internalFinisher, setInternalFinisher] = useInternalFinisherParam()

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
    </>
  )
}
