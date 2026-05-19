import type { AssetSummary } from 'shared-types'
import { getDepartureDetail } from './departure-api'
import { getHoldDetail } from './hold-api'
import { getInvoiceDetail } from './invoice-api'
import { getTransferDetail } from './transfer-api'

export type CollectionTarget =
  | { kind: 'departure'; number: string }
  | { kind: 'transfer';  number: string }
  | { kind: 'hold';      number: string }
  | { kind: 'invoice';   number: string }

export async function getCollectionAssets(target: CollectionTarget): Promise<AssetSummary[]> {
  switch (target.kind) {
    case 'departure': return (await getDepartureDetail(target.number)).assets
    case 'transfer':  return (await getTransferDetail(target.number)).assets
    case 'hold':      return (await getHoldDetail(target.number)).assets
    case 'invoice':   return (await getInvoiceDetail(target.number)).assets
  }
}
