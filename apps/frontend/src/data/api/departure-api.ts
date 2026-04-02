import { api } from '@/data/api/axios-client'
import { apiErrorHandler } from '@/lib/error-handler'
import type { DepartureForm } from '@/ui-types/departure-form-types'
import { type SelectOption, getIdOrNullFromSelection, getSelectOption, getSelectedOrNull } from '@/ui-types/select-option-types'
import type { AxiosResponse } from 'axios'
import type { ApiResponse, DepartureDetail, UpdateDeparture, Warehouse } from 'shared-types'
import { type DepartureSummary, DepartureDetailSchema, DepartureSummarySchema, UpdateDepartureSchema } from 'shared-types'
import { z } from 'zod'

interface CreateDepartureResponse {
  departureNumber: string
}

export async function getDepartures(
  fromDate: SelectOption<Date>,
  toDate: SelectOption<Date>,
  origin: SelectOption<Warehouse>
): Promise<DepartureSummary[]> {

  const { data } = await api.get<ApiResponse<DepartureSummary[]>>(`/departures`, {
    params: {
      fromDate: getSelectedOrNull(fromDate),
      toDate: getSelectedOrNull(toDate),
      warehouse: getIdOrNullFromSelection(origin),
    }
  })
  if (data.success) return z.array(DepartureSummarySchema).parse(data.data)
  throw new Error(data.error.summary)
}

export async function getDepartureDetail(departureNumber: string): Promise<DepartureDetail> {
  const { data } = await api.get<ApiResponse<DepartureDetail>>(`/departures/${departureNumber}`)
  if (data.success) return DepartureDetailSchema.parse(data.data)
  throw new Error(data.error.summary)
}

export async function getDepartureForUpdate(departureNumber: string): Promise<DepartureForm> {
  const { data } = await api.get<ApiResponse<UpdateDeparture>>(`/departures/${departureNumber}/edit`)
  if (data.success) return mapUpdateDepartureToDepartureForm(UpdateDepartureSchema.parse(data.data))
  throw new Error(data.error.summary)
}

export function mapUpdateDepartureToDepartureForm(departure: UpdateDeparture): DepartureForm {
  return {
    id: departure.id,
    origin: getSelectOption(departure.origin),
    customer: departure.customer,
    transporter: departure.transporter,
    comment: departure.comment ?? '',
    assets: departure.assets
  }
}

export async function createDeparture(d: DepartureForm): Promise<ApiResponse<CreateDepartureResponse>> {
  return api.post(
    '/departures',
    {
      origin: getSelectedOrNull(d.origin),
      customer: d.customer,
      transporter: d.transporter,
      comment: d.comment,
      assets: d.assets
    },
    { headers: { 'Content-Type': 'application/json' } }
  )
    .then((response: AxiosResponse<CreateDepartureResponse>) => ({
      success: true as const,
      data: response.data
    }))
    .catch(apiErrorHandler<CreateDepartureResponse>)
}

export async function updateDeparture(
  departureNumber: string,
  d: DepartureForm
): Promise<ApiResponse<CreateDepartureResponse>> {
  return api.put(
    `/departures/${departureNumber}`,
    {
      id: d.id,
      origin: getSelectedOrNull(d.origin),
      customer: d.customer,
      transporter: d.transporter,
      comment: d.comment,
      assets: d.assets
    },
    { headers: { 'Content-Type': 'application/json' } }
  )
    .then((response: AxiosResponse<CreateDepartureResponse>) => ({
      success: true as const,
      data: response.data
    }))
    .catch(apiErrorHandler<CreateDepartureResponse>)
}
