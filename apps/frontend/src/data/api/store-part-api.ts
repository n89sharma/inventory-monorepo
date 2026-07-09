import { api } from '@/data/api/axios-client'
import type { StoreTransactionForm, AddStorePartForm } from '@/ui-types/store-part-form-types'
import type {
  RecordStoreTransaction,
  StoreTransactionResponse,
  AddStorePartToAsset,
  AssetStorePartRow,
  StorePartDetail,
  StorePartSummary,
} from 'shared-types'
import {
  StoreTransactionResponseSchema,
  RecordStoreTransactionSchema,
  AddStorePartToAssetSchema,
  AssetStorePartRowSchema,
  StorePartDetailSchema,
  StorePartSummarySchema,
} from 'shared-types'
import { z } from 'zod'

export async function getStoreParts(): Promise<StorePartSummary[]> {
  const { data } = await api.get<StorePartSummary[]>('/store')
  return z.array(StorePartSummarySchema).parse(data)
}

export async function getStorePartDetail(partId: number): Promise<StorePartDetail> {
  const { data } = await api.get<StorePartDetail>(`/store/${partId}`)
  return StorePartDetailSchema.parse(data)
}

export async function recordStoreTransaction(
  warehouseId: number,
  form: StoreTransactionForm,
): Promise<StoreTransactionResponse> {
  const recordStoreTransactionBody = RecordStoreTransactionSchema.parse({
    kind: form.kind,
    part: buildPartPayload(form.part),
    warehouse_id: warehouseId,
    quantity: Number(form.quantity),
    unit_cost: form.unitCost.trim() === '' ? null : Number(form.unitCost),
    notes: form.notes.trim() === '' ? null : form.notes,
  } satisfies RecordStoreTransaction)
  const { data } = await api.post<StoreTransactionResponse>('/store', recordStoreTransactionBody)
  return StoreTransactionResponseSchema.parse(data)
}

function buildPartPayload(part: StoreTransactionForm['part']): RecordStoreTransaction['part'] {
  if (part === null) throw new Error('No part selected')
  if ('id' in part) return { mode: 'existing', store_part_id: part.id }
  return { mode: 'new', part_number: part.part_number, description: part.description }
}

export async function getAssetStoreParts(barcode: string): Promise<AssetStorePartRow[]> {
  const { data } = await api.get<AssetStorePartRow[]>(`/store/asset/${barcode}/parts`)
  return z.array(AssetStorePartRowSchema).parse(data)
}

export async function addStorePartToAsset(
  barcode: string,
  form: AddStorePartForm,
): Promise<StoreTransactionResponse> {
  if (form.part === null || form.warehouse === null) throw new Error('Part and warehouse required')
  const addStorePartToAssetBody = AddStorePartToAssetSchema.parse({
    store_part_id: form.part.id,
    warehouse_id: form.warehouse.id,
    quantity: Number(form.quantity),
    unit_cost: Number(form.unitCost),
  } satisfies AddStorePartToAsset)
  const { data } = await api.post<StoreTransactionResponse>(
    `/store/asset/${barcode}/parts`,
    addStorePartToAssetBody,
  )
  return StoreTransactionResponseSchema.parse(data)
}
