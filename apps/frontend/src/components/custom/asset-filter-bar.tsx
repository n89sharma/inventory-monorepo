import { CassettesFilter } from '@/components/filters/cassettes-filter'
import { InternalFinisherFilter } from '@/components/filters/internal-finisher-filter'
import { MeterRangeInput } from '@/components/filters/meter-range-input'
import { ModelFilter } from '@/components/filters/model-filter'
import { ReadinessFilter } from '@/components/filters/readiness-filter'
import { WarehouseFilter } from '@/components/filters/warehouse-filter'
import type { SharedAssetFilters } from '@/lib/asset-filter-params'

const DEFAULT_MODEL_PLACEHOLDER = 'Model'

export function AssetFilterBar<T extends SharedAssetFilters>({
  draft,
  onImmediate,
  onDebounced,
  scopeSlot,
  identitySlot,
  modelPlaceholder = DEFAULT_MODEL_PLACEHOLDER,
}: {
  draft: T
  onImmediate: (next: T) => void
  onDebounced: (next: T) => void
  scopeSlot?: React.ReactNode
  identitySlot?: React.ReactNode
  modelPlaceholder?: string
}): React.JSX.Element {
  return (
    <>
      <WarehouseFilter
        selection={draft.warehouses}
        onSelectionChange={(w) => onImmediate({ ...draft, warehouses: w })}
      />

      {scopeSlot}

      {identitySlot}

      <ModelFilter
        selection={draft.model}
        query={draft.modelQuery ?? ''}
        onSelectionChange={(m) =>
          onImmediate({
            ...draft,
            model: m,
            modelQuery: null,
          })
        }
        onQueryChange={(text) =>
          onDebounced({
            ...draft,
            modelQuery: text.length > 0 ? text : null,
            model: null,
          })
        }
        onClear={() =>
          onImmediate({
            ...draft,
            model: null,
            modelQuery: null,
          })
        }
        placeholder={modelPlaceholder}
      />

      <ReadinessFilter
        selection={draft.readinesses}
        onSelectionChange={(s) => onDebounced({ ...draft, readinesses: s })}
      />

      <MeterRangeInput
        min={draft.meterMin}
        max={draft.meterMax}
        onMinChange={(val) => onDebounced({ ...draft, meterMin: val })}
        onMaxChange={(val) => onDebounced({ ...draft, meterMax: val })}
        className="w-72"
      />

      <CassettesFilter
        value={draft.cassettes}
        onValueChange={(val) => onDebounced({ ...draft, cassettes: val })}
      />

      <InternalFinisherFilter
        selection={draft.internalFinisher}
        onSelectionChange={(c) => onImmediate({ ...draft, internalFinisher: c })}
        onClear={() => onImmediate({ ...draft, internalFinisher: null })}
      />
    </>
  )
}
