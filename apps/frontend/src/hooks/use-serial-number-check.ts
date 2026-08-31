import { getSerialNumberMatches } from '@/data/api/asset-api'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { normalizeForSearch, type SerialNumberMatch } from 'shared-types'
import useSWR from 'swr'

const SERIAL_NUMBER_CHECK_KEY = 'serial-number-check'

const SERIAL_CHECK_DEBOUNCE_MS = 500

const NO_MATCHES: SerialNumberMatch[] = []

export interface PersistedAsset {
  barcode: string
  serialNumber: string
}

export interface SerialNumberCheck {
  draftMatch: boolean
  databaseMatches: SerialNumberMatch[]
  totalDatabaseMatchCount: number
  isChecking: boolean
  hasMatch: boolean
  // A duplicate no acknowledgment can permit: an unsaved sibling, or a holder that was not sold on.
  isBlocked: boolean
}

/**
 * Reports whether a serial number already exists — on an unsaved sibling in the collection being
 * composed, or on a persisted asset — and whether that duplicate may be saved at all.
 *
 * The lookup follows the live field value through a debounce rather than a blur, so `isChecking`
 * covers the whole window in which the answer does not yet describe what is in the field. A caller
 * gating its Save button on it therefore only ever moves from disabled to enabled.
 *
 * Nothing is looked up while the serial matches the persisted asset's own: an update only has to
 * justify a serial it actually changes, which is the rule the write transaction applies in
 * `buildUpdateSerialCandidates`. Without it, an asset that legitimately shares a serial would be
 * unable to save any other edit.
 *
 * The SWR key is the *normalized* serial, which makes two spellings of one number a single request
 * and makes a type → retype sequence resolve to the right answer: an ad-hoc fetch would render
 * whichever response happened to land last.
 */
export function useSerialNumberCheck({
  serialNumber,
  persistedAsset,
  draftSerialNumbers,
}: {
  serialNumber: string
  persistedAsset: PersistedAsset | null
  draftSerialNumbers: string[]
}): SerialNumberCheck {
  const settledSerialNumber = useDebouncedValue(serialNumber, SERIAL_CHECK_DEBOUNCE_MS)
  const normalized = normalizeForSearch(settledSerialNumber)
  const isSerialChanged =
    persistedAsset === null || normalizeForSearch(persistedAsset.serialNumber) !== normalized
  const isLookupNeeded = normalized !== '' && isSerialChanged

  const { data, isLoading } = useSWR(
    isLookupNeeded ? [SERIAL_NUMBER_CHECK_KEY, normalized, persistedAsset?.barcode ?? null] : null,
    ([, , barcode]: [string, string, string | null]) =>
      getSerialNumberMatches(settledSerialNumber, barcode),
    { revalidateOnFocus: false, revalidateOnReconnect: false },
  )

  const draftMatch =
    isLookupNeeded && draftSerialNumbers.some((draft) => normalizeForSearch(draft) === normalized)
  const databaseMatches = data?.matches ?? NO_MATCHES

  return {
    draftMatch,
    databaseMatches,
    totalDatabaseMatchCount: data?.totalMatchCount ?? 0,
    isChecking: settledSerialNumber !== serialNumber || isLoading,
    hasMatch: draftMatch || databaseMatches.length > 0,
    isBlocked: draftMatch || (data?.blockingMatchCount ?? 0) > 0,
  }
}
