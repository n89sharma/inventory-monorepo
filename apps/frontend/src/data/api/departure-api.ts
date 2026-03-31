import { api } from '@/data/api/axios-client'
import { type SelectOption, getIdOrNullFromSelection, getSelectedOrNull } from '@/ui-types/select-option-types'
import type { ApiResponse, DepartureDetail, Warehouse } from 'shared-types'
import { type Departure, DepartureDetailSchema, DepartureSchema } from 'shared-types'
import { z } from 'zod'

export async function getDepartures(
  fromDate: SelectOption<Date>,
  toDate: SelectOption<Date>,
  origin: SelectOption<Warehouse>
): Promise<Departure[]> {

  const { data } = await api.get<ApiResponse<Departure[]>>(`/departures`, {
    params: {
      fromDate: getSelectedOrNull(fromDate),
      toDate: getSelectedOrNull(toDate),
      warehouse: getIdOrNullFromSelection(origin),
    }
  })
  if (data.success) return z.array(DepartureSchema).parse(data.data)
  throw new Error(data.error.summary)
}

export async function getDepartureDetail(departureNumber: string): Promise<DepartureDetail> {
  const { data } = await api.get<ApiResponse<DepartureDetail>>(`/departures/${departureNumber}`)
  if (data.success) return DepartureDetailSchema.parse(data.data)
  throw new Error(data.error.summary)
}
