import type { AssetSummary } from 'shared-types'
import { getDepartureForUpdate } from './departure-api'
import { getHoldForUpdate } from './hold-api'
import { getInvoiceForUpdate } from './invoice-api'
import { getTransferForUpdate } from './transfer-api'

export type CollectionTarget =
  | { kind: 'departure'; number: string }
  | { kind: 'transfer';  number: string }
  | { kind: 'hold';      number: string }
  | { kind: 'invoice';   number: string }

export async function getCollectionAssets(target: CollectionTarget): Promise<AssetSummary[]> {
  switch (target.kind) {
    case 'departure': return (await getDepartureForUpdate(target.number)).assets
    case 'transfer':  return (await getTransferForUpdate(target.number)).assets
    case 'hold':      return (await getHoldForUpdate(target.number)).assets
    case 'invoice':   return (await getInvoiceForUpdate(target.number)).assets
  }
}
