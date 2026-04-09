import { api } from '@/data/api/axios-client'
import { apiErrorHandler } from '@/lib/error-handler'
import type { HoldForm } from '@/ui-types/hold-form-types'
import { getIdOrNullFromSelection, getSelectedOrNull, type SelectOption } from '@/ui-types/select-option-types'
import type { ApiResponse, HoldDetail, User } from 'shared-types'
import { HoldDetailSchema, HoldSummarySchema, type HoldSummary } from 'shared-types'
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

export async function getHoldDetail(holdNumber: string): Promise<ApiResponse<HoldDetail>> {
  return api.get<ApiResponse<HoldDetail>>(`/holds/${holdNumber}`)
    .then(({ data }: AxiosResponse<ApiResponse<HoldDetail>>) => {
      if (data.success) return { success: true as const, data: HoldDetailSchema.parse(data.data) }
      return data
    })
    .catch(apiErrorHandler<HoldDetail>)
}
