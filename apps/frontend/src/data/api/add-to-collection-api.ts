import type { AssetSummary } from 'shared-types'
import { getDepartureForUpdate, updateDeparture } from './departure-api'
import { getHoldForUpdate, updateHold } from './hold-api'
import { getInvoiceForUpdate, updateInvoice } from './invoice-api'
import { getTransferForUpdate, updateTransfer } from './transfer-api'

export type CollectionTarget =
  | { kind: 'departure'; number: string }
  | { kind: 'transfer';  number: string }
  | { kind: 'hold';      number: string }
  | { kind: 'invoice';   number: string }

function mergeAssets(
  existing: AssetSummary[],
  toAdd: AssetSummary[]
): { merged: AssetSummary[]; added: number; skipped: number } {
  const existingIds = new Set(existing.map(a => a.id))
  const newOnly = toAdd.filter(a => !existingIds.has(a.id))
  return { merged: [...existing, ...newOnly], added: newOnly.length, skipped: toAdd.length - newOnly.length }
}

export async function getCollectionAssets(target: CollectionTarget): Promise<AssetSummary[]> {
  switch (target.kind) {
    case 'departure': return (await getDepartureForUpdate(target.number)).assets
    case 'transfer':  return (await getTransferForUpdate(target.number)).assets
    case 'hold':      return (await getHoldForUpdate(target.number)).assets
    case 'invoice':   return (await getInvoiceForUpdate(target.number)).assets
  }
}

export async function addAssetsToCollection(
  target: CollectionTarget,
  newAssets: AssetSummary[]
): Promise<{ added: number; skipped: number }> {
  switch (target.kind) {
    case 'departure': {
      const form = await getDepartureForUpdate(target.number)
      const { merged, added, skipped } = mergeAssets(form.assets, newAssets)
      const result = await updateDeparture(target.number, { ...form, assets: merged })
      if (!result.success) throw new Error(result.error.summary)
      return { added, skipped }
    }
    case 'transfer': {
      const form = await getTransferForUpdate(target.number)
      const { merged, added, skipped } = mergeAssets(form.assets, newAssets)
      const result = await updateTransfer(target.number, { ...form, assets: merged })
      if (!result.success) throw new Error(result.error.summary)
      return { added, skipped }
    }
    case 'hold': {
      const form = await getHoldForUpdate(target.number)
      const { merged, added, skipped } = mergeAssets(form.assets, newAssets)
      const result = await updateHold(target.number, { ...form, assets: merged })
      if (!result.success) throw new Error(result.error.summary)
      return { added, skipped }
    }
    case 'invoice': {
      const form = await getInvoiceForUpdate(target.number)
      const { merged, added, skipped } = mergeAssets(form.assets, newAssets)
      const result = await updateInvoice(target.number, { ...form, assets: merged })
      if (!result.success) throw new Error(result.error.summary)
      return { added, skipped }
    }
  }
}
