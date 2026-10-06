import { getBidDetail, getBidModelStock, getBids } from '@/data/api/bid-api'
import { toDateParam } from '@/lib/date-param'
import type { SalesWindowMonths } from '@/lib/filters/parsers'
import { salesWindowStart } from '@/lib/model-price-history-summary'
import type { SelectOption } from '@/ui-types/select-option-types'
import { getIdOrNullFromSelection, getSelectedOrNull } from '@/ui-types/select-option-types'
import type { OrgDetail } from 'shared-types'
import useSWR, { mutate, preload } from 'swr'

const BID_DETAIL_KEY_PREFIX = 'bid:'

export const bidDetailKey = (bidNumber: string) => `${BID_DETAIL_KEY_PREFIX}${bidNumber}`

export function useBidDetail(bidNumber: string) {
  return useSWR(bidDetailKey(bidNumber), () => getBidDetail(bidNumber))
}

export function preloadBidDetail(bidNumber: string) {
  preload(bidDetailKey(bidNumber), () => getBidDetail(bidNumber))
}

export function clearBidDetail(bidNumber: string): void {
  mutate(bidDetailKey(bidNumber), undefined, { revalidate: false })
}

const BID_MODEL_STOCK_KEY_PREFIX = 'bid:model-stock'

export function useBidModelStock(bidNumber: string, months: SalesWindowMonths) {
  return useSWR(
    [BID_MODEL_STOCK_KEY_PREFIX, bidNumber, salesWindowStart(months)],
    ([, keyBidNumber, salesFrom]: [string, string, string]) =>
      getBidModelStock(keyBidNumber, salesFrom),
    { revalidateOnFocus: false, revalidateOnReconnect: false, keepPreviousData: true },
  )
}

export function invalidateBidModelStock(bidNumber: string) {
  return mutate(
    (key) => Array.isArray(key) && key[0] === BID_MODEL_STOCK_KEY_PREFIX && key[1] === bidNumber,
    undefined,
    { revalidate: true },
  )
}

const BID_LIST_KEY_PREFIX = 'bids:list'

type BidListKey = readonly [typeof BID_LIST_KEY_PREFIX, string | null, string | null, number | null]

function bidListKey(
  fromDate: SelectOption<Date>,
  toDate: SelectOption<Date>,
  vendor: SelectOption<OrgDetail>,
): BidListKey | null {
  const from = getSelectedOrNull(fromDate)
  if (from === null) return null
  return [
    BID_LIST_KEY_PREFIX,
    toDateParam(from),
    toDateParam(getSelectedOrNull(toDate)),
    getIdOrNullFromSelection(vendor),
  ]
}

export function useBidsList(
  fromDate: SelectOption<Date>,
  toDate: SelectOption<Date>,
  vendor: SelectOption<OrgDetail>,
) {
  return useSWR(bidListKey(fromDate, toDate, vendor), () => getBids(fromDate, toDate, vendor))
}

export function invalidateBidLists() {
  return mutate((key) => Array.isArray(key) && key[0] === BID_LIST_KEY_PREFIX, undefined, {
    revalidate: true,
  })
}
