import { api } from '@/data/api/axios-client'
import type { ApiResponse } from 'shared-types'
import { type ReferenceData, ReferenceDataSchema } from 'shared-types'

export async function getReferenceData(): Promise<ReferenceData> {
  const { data } = await api.get<ApiResponse<ReferenceData>>('/constants')
  if (data.success) return ReferenceDataSchema.parse(data.data)
  throw new Error(data.error.summary)
}