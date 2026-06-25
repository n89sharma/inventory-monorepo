import { METER_BANDS } from '@/lib/model-sales-summary'
import type { MeterBand } from 'shared-types'

export const METER_BAND_LABELS = {
  UNKNOWN: 'Unknown',
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
} as const satisfies Record<MeterBand, string>

export const METER_BAND_LEGEND = [
  { label: METER_BAND_LABELS.LOW, range: METER_BANDS[0].label },
  { label: METER_BAND_LABELS.MEDIUM, range: METER_BANDS[1].label },
  { label: METER_BAND_LABELS.HIGH, range: METER_BANDS[2].label },
] as const
