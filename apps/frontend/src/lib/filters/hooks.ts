import { useModelStore } from '@/data/store/model-store'
import { useOrgStore } from '@/data/store/org-store'
import { useReferenceDataStore } from '@/data/store/reference-data-store'
import { useUserStore } from '@/data/store/user-store'
import { FILTER_PARSERS, parseAsIdList } from '@/lib/filters/parsers'
import { isAfter, isBefore, startOfDay, subDays, subMonths } from 'date-fns'
import { parseAsInteger, useQueryState, useQueryStates } from 'nuqs'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  OUTGOING_STATUS,
  type AssetType,
  type Brand,
  type Component,
  type ModelSummary,
  type OrgSummary,
  type Status,
  type User,
  type Warehouse,
} from 'shared-types'

export const MIN_MODEL_INPUT_QUERY_LENGTH = 3
const DEFAULT_FILTER_DEBOUNCE_MS = 600
const MAX_DEPARTED_MONTHS = 18
const DEFAULT_FROM_DAYS = 30

export type SoldReportRange = 6 | 12
const DEFAULT_SOLD_RANGE: SoldReportRange = 6

const ID_LIST_DEFAULT: number[] = []
const idListParser = parseAsIdList.withDefault(ID_LIST_DEFAULT)
const priceCheckParser = FILTER_PARSERS.pricecheck.withDefault(false)
const showOtherParser = FILTER_PARSERS.other.withDefault(false)
const specsParser = FILTER_PARSERS.specs.withDefault(false)
const searchParser = FILTER_PARSERS.search.withDefault('')
const MODEL_PARSERS = { model: FILTER_PARSERS.model, q: FILTER_PARSERS.q }

function resolveOne<T extends { id: number }>(id: number | null, list: T[]): T | null {
  return id === null ? null : (list.find((item) => item.id === id) ?? null)
}

// Preserves the id order from the URL, matching the legacy `decodeIds`.
function resolveMany<T extends { id: number }>(ids: number[], list: T[]): T[] {
  if (ids.length === 0) return []
  const byId = new Map(list.map((item) => [item.id, item]))
  return ids.map((id) => byId.get(id)).filter((item): item is T => item !== undefined)
}

function useCallbackRef<A extends unknown[], R>(
  fn: (...args: A) => R,
): React.RefObject<(...args: A) => R> {
  const ref = useRef(fn)
  useEffect(() => {
    ref.current = fn
  })
  return ref
}

// Local draft that updates immediately for a responsive UI while the committed
// value (the URL, which keys SWR) is written on a trailing debounce. Re-syncs the
// draft when the committed value changes externally (nav, saved view, back button).
function useDebouncedParam<T>(
  committed: T,
  commit: (value: T) => void,
  delayMs: number = DEFAULT_FILTER_DEBOUNCE_MS,
): [T, (value: T) => void, () => void] {
  const [draft, setDraft] = useState(committed)
  const [prevCommitted, setPrevCommitted] = useState(committed)
  const commitRef = useCallbackRef(commit)
  const timerRef = useRef<number | null>(null)

  if (committed !== prevCommitted) {
    setPrevCommitted(committed)
    setDraft(committed)
  }

  const cancel = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  useEffect(() => cancel, [cancel])

  const setValue = useCallback(
    (value: T) => {
      setDraft(value)
      if (timerRef.current !== null) clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null
        commitRef.current(value)
      }, delayMs)
    },
    [commitRef, delayMs],
  )

  return [draft, setValue, cancel]
}

function useIdListParam<T extends { id: number }>(
  key: string,
  list: T[],
): [T[], (next: T[]) => void] {
  const [ids, setIds] = useQueryState(key, idListParser)
  const resolved = useMemo(() => resolveMany(ids, list), [ids, list])
  const setValue = useCallback(
    (next: T[]) => {
      void setIds(next.length > 0 ? next.map((item) => item.id) : null)
    },
    [setIds],
  )
  return [resolved, setValue]
}

function useDebouncedIdListParam<T extends { id: number }>(
  key: string,
  list: T[],
): [T[], (next: T[]) => void] {
  const [committed, commit] = useIdListParam(key, list)
  const [draft, setDraft] = useDebouncedParam(committed, commit)
  return [draft, setDraft]
}

function useIdParam<T extends { id: number }>(
  key: string,
  list: T[],
): [T | null, (next: T | null) => void] {
  const [id, setId] = useQueryState(key, parseAsInteger)
  const resolved = useMemo(() => resolveOne(id, list), [id, list])
  const setValue = useCallback(
    (next: T | null) => {
      void setId(next?.id ?? null)
    },
    [setId],
  )
  return [resolved, setValue]
}

function useDebouncedNumberParam(key: string): [number | null, (next: number | null) => void] {
  const [committed, setCommitted] = useQueryState(key, FILTER_PARSERS.cas)
  const commit = useCallback((next: number | null) => void setCommitted(next), [setCommitted])
  const [draft, setDraft] = useDebouncedParam(committed, commit)
  return [draft, setDraft]
}

export function useWarehousesParam(): [Warehouse[], (next: Warehouse[]) => void] {
  const warehouses = useReferenceDataStore((state) => state.warehouses)
  return useIdListParam('wh', warehouses)
}

export type SharedAssetFilters = {
  warehouses: Warehouse[]
  model: ModelSummary | null
  modelQuery: string | null
  readinesses: Status[]
  meterMin: number | null
  meterMax: number | null
  cassettes: number | null
  internalFinisher: Component | null
}

// Composes the shared filters into the resolved object the SWR hooks consume.
// Read-only: callers that never invoke a setter observe the committed (URL) value,
// so SWR keys on the debounced value while the filter bar edits its own draft.
export function useSharedAssetFilters(): SharedAssetFilters {
  const [warehouses] = useWarehousesParam()
  const { model, modelQuery } = useModelParam()
  const [readinesses] = useReadinessesParam()
  const { min, max } = useMeterRangeParam()
  const [cassettes] = useCassettesParam()
  const [internalFinisher] = useInternalFinisherParam()
  return useMemo(
    () => ({
      warehouses,
      model,
      modelQuery: modelQuery.length >= MIN_MODEL_INPUT_QUERY_LENGTH ? modelQuery : null,
      readinesses,
      meterMin: min,
      meterMax: max,
      cassettes,
      internalFinisher,
    }),
    [warehouses, model, modelQuery, readinesses, min, max, cassettes, internalFinisher],
  )
}

export function useReadinessesParam(): [Status[], (next: Status[]) => void] {
  const readinesses = useReferenceDataStore((state) => state.readinesses)
  return useDebouncedIdListParam('readiness', readinesses)
}

export function useAssetTypesParam(): [AssetType[], (next: AssetType[]) => void] {
  const assetTypes = useReferenceDataStore((state) => state.assetTypes)
  return useDebouncedIdListParam('type', assetTypes)
}

export function useStatusesParam(): [Status[], (next: Status[]) => void] {
  const statuses = useReferenceDataStore((state) => state.statuses)
  return useDebouncedIdListParam('status', statuses)
}

export function useBrandParam(): [Brand | null, (next: Brand | null) => void] {
  const brands = useReferenceDataStore((state) => state.brands)
  return useIdParam('brand', brands)
}

export function useInternalFinisherParam(): [Component | null, (next: Component | null) => void] {
  const components = useReferenceDataStore((state) => state.components)
  return useIdParam('fin', components)
}

export function useCustomerParam(): [OrgSummary | null, (next: OrgSummary | null) => void] {
  const organizations = useOrgStore((state) => state.organizations)
  return useIdParam('customer', organizations)
}

export function useHoldCustomerParam(): [OrgSummary | null, (next: OrgSummary | null) => void] {
  const organizations = useOrgStore((state) => state.organizations)
  return useIdParam('holdcustomer', organizations)
}

export function useVendorParam(): [OrgSummary | null, (next: OrgSummary | null) => void] {
  const organizations = useOrgStore((state) => state.organizations)
  return useIdParam('vendor', organizations)
}

export function useHeldByParam(): [User | null, (next: User | null) => void] {
  const users = useUserStore((state) => state.users)
  return useIdParam('heldby', users)
}

export function useHeldForParam(): [User | null, (next: User | null) => void] {
  const users = useUserStore((state) => state.users)
  return useIdParam('heldfor', users)
}

export function useSalespersonParam(): [User | null, (next: User | null) => void] {
  const users = useUserStore((state) => state.users)
  return useIdParam('sp', users)
}

export function useCassettesParam(): [number | null, (next: number | null) => void] {
  return useDebouncedNumberParam('cas')
}

export function useDaysHeldParam(): [number | null, (next: number | null) => void] {
  return useDebouncedNumberParam('heldmin')
}

export function useMeterRangeParam(): {
  min: number | null
  max: number | null
  setMin: (next: number | null) => void
  setMax: (next: number | null) => void
} {
  const [min, setMin] = useDebouncedNumberParam('meter_min')
  const [max, setMax] = useDebouncedNumberParam('meter_max')
  return { min, max, setMin, setMax }
}

export function useModelParam(): {
  model: ModelSummary | null
  modelQuery: string
  setModel: (next: ModelSummary | null) => void
  setModelQuery: (text: string) => void
  clear: () => void
} {
  const models = useModelStore((state) => state.models)
  const [{ model: modelId, q }, setModelState] = useQueryStates(MODEL_PARSERS)
  const model = useMemo(() => resolveOne(modelId, models), [modelId, models])
  const committedQuery = model ? '' : (q ?? '')
  const commitQuery = useCallback(
    (text: string) => {
      void setModelState({
        model: null,
        q: text.length >= MIN_MODEL_INPUT_QUERY_LENGTH ? text : null,
      })
    },
    [setModelState],
  )
  const [modelQuery, setModelQuery, cancelQuery] = useDebouncedParam(committedQuery, commitQuery)
  const setModel = useCallback(
    (next: ModelSummary | null) => {
      cancelQuery()
      void setModelState({ model: next?.id ?? null, q: null })
    },
    [cancelQuery, setModelState],
  )
  const clear = useCallback(() => {
    cancelQuery()
    void setModelState({ model: null, q: null })
  }, [cancelQuery, setModelState])
  return { model, modelQuery, setModel, setModelQuery, clear }
}

export function usePriceCheckParam(): [boolean, (next: boolean) => void] {
  const [on, setOn] = useQueryState('pricecheck', priceCheckParser)
  const setValue = useCallback((next: boolean) => void setOn(next ? true : null), [setOn])
  return [on, setValue]
}

export function useShowOtherParam(): [boolean, (next: boolean) => void] {
  const [on, setOn] = useQueryState('other', showOtherParser)
  const setValue = useCallback((next: boolean) => void setOn(next ? true : null), [setOn])
  return [on, setValue]
}

export function useSpecsVisibleParam(): [boolean, (next: boolean) => void] {
  const [on, setOn] = useQueryState('specs', specsParser)
  const setValue = useCallback((next: boolean) => void setOn(next ? true : null), [setOn])
  return [on, setValue]
}

export function useSoldReportRangeParam(): [SoldReportRange, (next: SoldReportRange) => void] {
  const [raw, setRaw] = useQueryState('range', FILTER_PARSERS.range)
  const range: SoldReportRange = raw === 12 ? 12 : DEFAULT_SOLD_RANGE
  const setRange = useCallback(
    (next: SoldReportRange) => void setRaw(next === 12 ? 12 : null),
    [setRaw],
  )
  return [range, setRange]
}

export function useYearParam(defaultYear: number): [number, (next: number) => void] {
  const [raw, setRaw] = useQueryState('year', FILTER_PARSERS.year)
  const year = raw ?? defaultYear
  const setYear = useCallback((next: number) => void setRaw(next), [setRaw])
  useEffect(() => {
    if (raw === null) void setRaw(defaultYear)
  }, [raw, defaultYear, setRaw])
  return [year, setYear]
}

export function useDepartedRangeParam(): {
  from: Date
  to: Date
  setRange: (from: Date, to: Date) => void
} {
  const [fromRaw, setFrom] = useQueryState('from', FILTER_PARSERS.from)
  const [toRaw, setTo] = useQueryState('to', FILTER_PARSERS.to)
  const from = useMemo(
    () => fromRaw ?? startOfDay(subDays(new Date(), DEFAULT_FROM_DAYS)),
    [fromRaw],
  )
  const to = useMemo(() => toRaw ?? new Date(), [toRaw])
  const setRange = useCallback(
    (nextFrom: Date, nextTo: Date) => {
      void setFrom(nextFrom)
      void setTo(nextTo)
    },
    [setFrom, setTo],
  )
  useEffect(() => {
    if (fromRaw === null) void setFrom(from)
    if (toRaw === null) void setTo(to)
  }, [fromRaw, toRaw, from, to, setFrom, setTo])
  return { from, to, setRange }
}

export function useStoreWarehousesParam(): [Warehouse[], (next: Warehouse[]) => void] {
  const warehouses = useReferenceDataStore((state) => state.warehouses)
  return useIdListParam('warehouse', warehouses)
}

export function useStoreSearchParam(): [string, (next: string) => void] {
  const [search, setSearch] = useQueryState('search', searchParser)
  const setValue = useCallback(
    (next: string) => {
      const trimmed = next.trim()
      void setSearch(trimmed.length > 0 ? trimmed : null)
    },
    [setSearch],
  )
  return [search, setValue]
}

export function resolveWarehouseScope(
  selected: Warehouse[],
  activeWarehouses: Warehouse[],
): Warehouse[] {
  return selected.length > 0 ? selected : activeWarehouses
}

export function getDepartedFloor(): Date {
  return startOfDay(subMonths(new Date(), MAX_DEPARTED_MONTHS))
}

export function isValidSoldDateRange(from: Date, to: Date): boolean {
  return !isBefore(from, getDepartedFloor()) && !isAfter(from, to)
}

export function resolveSoldStatuses(showOther: boolean, allStatuses: Status[]): Status[] {
  const wanted = new Set<string>(
    showOther ? [OUTGOING_STATUS.HARVESTED, OUTGOING_STATUS.SCRAPPED] : [OUTGOING_STATUS.SOLD],
  )
  return allStatuses.filter((status) => wanted.has(status.status))
}
