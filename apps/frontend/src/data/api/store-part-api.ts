import { api } from '@/data/api/axios-client'
import type { AddPurchaseForm } from '@/ui-types/store-part-form-types'
import type {
  AddPurchase,
  AddPurchaseResponse,
  StorePartDetail,
  StorePartSummary
} from 'shared-types'
import {
  AddPurchaseResponseSchema,
  AddPurchaseSchema,
  StorePartDetailSchema,
  StorePartSummarySchema
} from 'shared-types'
import { z } from 'zod'

export async function getStoreParts(): Promise<StorePartSummary[]> {
  const { data } = await api.get<StorePartSummary[]>('/store')
  return z.array(StorePartSummarySchema).parse(data)
}

export async function getStorePartDetail(partNumber: string): Promise<StorePartDetail> {
  const { data } = await api.get<StorePartDetail>(`/store/${partNumber}`)
  return StorePartDetailSchema.parse(data)
}

export async function addPurchase(
  warehouseId: number,
  form: AddPurchaseForm
): Promise<AddPurchaseResponse> {
  const addPurchaseBody = AddPurchaseSchema.parse({
    part: buildPartPayload(form.part),
    warehouse_id: warehouseId,
    quantity: Number(form.quantity),
    unit_cost: form.unitCost.trim() === '' ? null : Number(form.unitCost),
    notes: form.notes.trim() === '' ? null : form.notes
  } satisfies AddPurchase)
  const { data } = await api.post<AddPurchaseResponse>('/store', addPurchaseBody)
  return AddPurchaseResponseSchema.parse(data)
}

function buildPartPayload(part: AddPurchaseForm['part']): AddPurchase['part'] {
  if (part === null) throw new Error('No part selected')
  if ('id' in part) return { mode: 'existing', store_part_id: part.id }
  return { mode: 'new', part_number: part.part_number, description: part.description }
}
