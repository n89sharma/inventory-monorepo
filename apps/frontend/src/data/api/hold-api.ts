import { api } from '@/data/api/axios-client'
import type { HoldForm } from '@/ui-types/hold-form-types'
import { getIdOrNullFromSelection, getSelectOption, getSelectedOrNull, type SelectOption } from '@/ui-types/select-option-types'
import type { CollectionHistory, HoldDetail, UpdateHold, User } from 'shared-types'
import { HoldDetailSchema, HoldSummarySchema, UpdateHoldSchema, type HoldSummary } from 'shared-types'
import { z } from 'zod'

interface CreateHoldResponse {
  holdNumber: string
}

export async function getHolds(
  fromDate: SelectOption<Date>,
  toDate: SelectOption<Date>,
  holdBy: SelectOption<User>,
  holdFor: SelectOption<User>
): Promise<HoldSummary[]> {
  const { data } = await api.get<{ success: true; data: HoldSummary[] }>(`/holds`, {
    params: {
      fromDate: getSelectedOrNull(fromDate),
      toDate: getSelectedOrNull(toDate),
      holdBy: getIdOrNullFromSelection(holdBy),
      holdFor: getIdOrNullFromSelection(holdFor)
    }
  })
  return z.array(HoldSummarySchema).parse(data.data)
}

export async function createHold(d: HoldForm): Promise<CreateHoldResponse> {
  return (await api.post<CreateHoldResponse>('/holds', {
    created_for_id: getIdOrNullFromSelection(d.created_for),
    customer_id: d.customer!.id,
    notes: d.notes || null,
    assets: d.assets
  })).data
}

export async function getHoldForUpdate(holdNumber: string): Promise<HoldForm> {
  const { data } = await api.get<{ success: true; data: UpdateHold }>(`/holds/${holdNumber}/edit`)
  return mapUpdateHoldToHoldForm(UpdateHoldSchema.parse(data.data))
}

export function mapUpdateHoldToHoldForm(hold: UpdateHold): HoldForm {
  return {
    id: hold.id,
    created_for: getSelectOption(hold.created_for),
    customer: hold.customer,
    notes: hold.notes ?? '',
    assets: hold.assets
  }
}

export async function updateHold(
  holdNumber: string,
  d: HoldForm
): Promise<{ holdNumber: string }> {
  return (await api.put<{ holdNumber: string }>(`/holds/${holdNumber}`, {
    id: d.id,
    created_for: getSelectedOrNull(d.created_for),
    customer: d.customer,
    notes: d.notes || null,
    assets: d.assets
  })).data
}

export async function getHoldDetail(holdNumber: string): Promise<HoldDetail> {
  const { data } = await api.get<{ success: true; data: HoldDetail }>(`/holds/${holdNumber}`)
  return HoldDetailSchema.parse(data.data)
}

export async function getHoldHistory(holdNumber: string): Promise<CollectionHistory> {
  const { data } = await api.get<{ success: true; data: CollectionHistory }>(`/holds/${holdNumber}/history`)
  return data.data
}
