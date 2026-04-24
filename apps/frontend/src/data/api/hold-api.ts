import { api } from '@/data/api/axios-client'
import { apiErrorHandler } from '@/lib/error-handler'
import type { HoldForm } from '@/ui-types/hold-form-types'
import { getIdOrNullFromSelection, getSelectOption, getSelectedOrNull, type SelectOption } from '@/ui-types/select-option-types'
import type { ApiResponse, HoldDetail, UpdateHold, User } from 'shared-types'
import { HoldDetailSchema, HoldSummarySchema, UpdateHoldSchema, type HoldSummary } from 'shared-types'
import type { AxiosResponse } from 'axios'
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
  const { data } = await api.get<ApiResponse<HoldSummary[]>>(`/holds`, {
    params: {
      fromDate: getSelectedOrNull(fromDate),
      toDate: getSelectedOrNull(toDate),
      holdBy: getIdOrNullFromSelection(holdBy),
      holdFor: getIdOrNullFromSelection(holdFor)
    }
  })
  if (data.success) return z.array(HoldSummarySchema).parse(data.data)
  throw new Error(data.error.summary)
}

export async function createHold(d: HoldForm): Promise<ApiResponse<CreateHoldResponse>> {
  return api.post(
    '/holds',
    {
      created_for_id: getIdOrNullFromSelection(d.created_for),
      customer_id: d.customer!.id,
      notes: d.notes || null,
      assets: d.assets
    },
    { headers: { 'Content-Type': 'application/json' } }
  )
    .then((response: AxiosResponse<CreateHoldResponse>) => ({
      success: true as const,
      data: response.data
    }))
    .catch(apiErrorHandler<CreateHoldResponse>)
}

export async function getHoldForUpdate(holdNumber: string): Promise<HoldForm> {
  const { data } = await api.get<ApiResponse<UpdateHold>>(`/holds/${holdNumber}/edit`)
  if (data.success) return mapUpdateHoldToHoldForm(UpdateHoldSchema.parse(data.data))
  throw new Error(data.error.summary)
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
): Promise<ApiResponse<{ holdNumber: string }>> {
  return api.put(
    `/holds/${holdNumber}`,
    {
      id: d.id,
      created_for: getSelectedOrNull(d.created_for),
      customer: d.customer,
      notes: d.notes || null,
      assets: d.assets
    },
    { headers: { 'Content-Type': 'application/json' } }
  )
    .then((response: AxiosResponse<{ holdNumber: string }>) => ({
      success: true as const,
      data: response.data
    }))
    .catch(apiErrorHandler<{ holdNumber: string }>)
}

export async function getHoldDetail(holdNumber: string): Promise<HoldDetail> {
  const { data } = await api.get<ApiResponse<HoldDetail>>(`/holds/${holdNumber}`)
  if (data.success) return HoldDetailSchema.parse(data.data)
  throw new Error(data.error.summary)
}
