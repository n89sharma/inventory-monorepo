import { api } from '@/data/api/axios-client'
import { getIdOrNullFromSelection, getSelectedOrNull, type SelectOption } from '@/ui-types/select-option-types'
import type { ApiResponse, HoldDetail, User } from 'shared-types'
import { HoldDetailSchema, HoldSummarySchema, type HoldSummary } from 'shared-types'
import { z } from 'zod'

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

export async function getHoldDetail(holdNumber: string): Promise<HoldDetail> {
  const { data } = await api.get<ApiResponse<HoldDetail>>(`/holds/${holdNumber}`)
  if (data.success) return HoldDetailSchema.parse(data.data)
  throw new Error(data.error.summary)
}
