import { CassettesFilter } from '@/components/filters/cassettes-filter'
import { InternalFinisherFilter } from '@/components/filters/internal-finisher-filter'
import { MeterRangeInput } from '@/components/filters/meter-range-input'
import { ModelFilter } from '@/components/filters/model-filter'
import { ReadinessFilter } from '@/components/filters/readiness-filter'
import { WarehouseFilter } from '@/components/filters/warehouse-filter'
import {
  useCassettesParam,
  useInternalFinisherParam,
  useMeterRangeParam,
  useModelParam,
  useReadinessesParam,
  useWarehousesParam,
} from '@/lib/filters/hooks'

const DEFAULT_MODEL_PLACEHOLDER = 'Model'

export function AssetFilterBar({
  scopeSlot,
  identitySlot,
  modelPlaceholder = DEFAULT_MODEL_PLACEHOLDER,
}: {
  scopeSlot?: React.ReactNode
  identitySlot?: React.ReactNode
  modelPlaceholder?: string
}): React.JSX.Element {
  const [warehouses, setWarehouses] = useWarehousesParam()
  const { model, modelQuery, setModel, setModelQuery, clear } = useModelParam()
  const [readinesses, setReadinesses] = useReadinessesParam()
  const { min, max, setMin, setMax } = useMeterRangeParam()
  const [cassettes, setCassettes] = useCassettesParam()
  const [internalFinisher, setInternalFinisher] = useInternalFinisherParam()

  return (
    <>
      <WarehouseFilter selection={warehouses} onSelectionChange={setWarehouses} />

      {scopeSlot}

      {identitySlot}

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
    </>
  )
}
