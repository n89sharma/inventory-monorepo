import { api } from '@/data/api/axios-client'
import { type ReferenceData, ReferenceDataSchema } from 'shared-types'

export async function getReferenceData(): Promise<ReferenceData> {
  const { data } = await api.get<{ success: true; data: ReferenceData }>('/reference')
  return ReferenceDataSchema.parse(data.data)
}
