import { ExclusiveOptionsFilter } from '@/components/shared/filters/exclusive-options-filter'
import { METER_BANDS } from '@/lib/model-price-history-summary'
import type { MeterBand } from 'shared-types'

const ALL_LABEL = 'All'
const GROUP_LABEL = 'Filter by meter band'
const ALL_ARIA_LABEL = 'Select all meter bands'

type MeterBandOption = { id: MeterBand; label: string }

const METER_BAND_OPTIONS = [
  { id: 'HIGH', label: METER_BANDS[2].label },
  { id: 'MEDIUM', label: METER_BANDS[1].label },
  { id: 'LOW', label: METER_BANDS[0].label },
  { id: 'UNKNOWN', label: 'Unknown' },
] as const satisfies readonly MeterBandOption[]

export function MeterBandFilter({
  selection,
  onSelectionChange,
}: {
  selection: MeterBand | null
  onSelectionChange: (band: MeterBand | null) => void
}): React.JSX.Element {
  return (
    <ExclusiveOptionsFilter<MeterBandOption>
      options={METER_BAND_OPTIONS}
      selection={METER_BAND_OPTIONS.filter((option) => option.id === selection)}
      onSelectionChange={(next) => onSelectionChange(next[0]?.id ?? null)}
      getLabel={(option) => option.label}
      allLabel={ALL_LABEL}
      groupLabel={GROUP_LABEL}
      getOptionAriaLabel={(option) => `Filter by meter band ${option.label}`}
      allAriaLabel={ALL_ARIA_LABEL}
    />
  )
}
