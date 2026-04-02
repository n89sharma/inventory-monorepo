import { api } from '@/data/api/axios-client'
import { apiErrorHandler } from '@/lib/error-handler'
import type { ArrivalForm } from '@/ui-types/arrival-form-types'
import { type SelectOption, getIdOrNullFromSelection, getSelectOption, getSelectedOrNull } from '@/ui-types/select-option-types'
import type { AxiosResponse } from 'axios'
import type { ApiResponse, ArrivalDetail, ArrivalSummary, UpdateArrival, Warehouse } from 'shared-types'
import { ArrivalDetailSchema, ArrivalSummarySchema, UpdateArrivalSchema } from 'shared-types'
import { z } from 'zod'

interface CreateArrivalResponse {
  arrivalNumber: string
}

export async function getArrivals(
  fromDate: SelectOption<Date>,
  toDate: SelectOption<Date>,
  destination: SelectOption<Warehouse>
): Promise<ArrivalSummary[]> {

  const { data } = await api.get<ApiResponse<ArrivalSummary[]>>(`/arrivals`, {
    params: {
      fromDate: getSelectedOrNull(fromDate),
      toDate: getSelectedOrNull(toDate),
      warehouse: getIdOrNullFromSelection(destination)
    }
  })
  if (data.success) return z.array(ArrivalSummarySchema).parse(data.data)
  throw new Error(data.error.summary)
}

export async function getArrivalDetail(arrivalNumber: string): Promise<ArrivalDetail> {
  const { data } = await api.get<ApiResponse<ArrivalDetail>>(`/arrivals/${arrivalNumber}`)
  if (data.success) return ArrivalDetailSchema.parse(data.data)
  throw new Error(data.error.summary)
}

export async function getArrivalForUpdate(arrivalNumber: string): Promise<ArrivalForm> {
  const { data } = await api.get<ApiResponse<UpdateArrival>>(`/arrivals/${arrivalNumber}/edit`)
  if (data.success) return mapUpdateArrivalToUiArrivalForm(UpdateArrivalSchema.parse(data.data))
  throw new Error(data.error.summary)
}

export function mapUpdateArrivalToUiArrivalForm(arrival: UpdateArrival): ArrivalForm {
  return {
    id: arrival.id,
    vendor: arrival.vendor,
    transporter: arrival.transporter,
    warehouse: getSelectOption(arrival.warehouse),
    comment: arrival.comment ?? '',
    assets: arrival.assets.map(asset => ({
      id: asset.id,
      model: asset.model,
      serialNumber: asset.serialNumber,
      meterBlack: asset.meterBlack,
      meterColour: asset.meterColour,
      cassettes: asset.cassettes,
      technicalStatus: getSelectOption(asset.technicalStatus),
      internalFinisher: asset.internalFinisher,
      coreFunctions: asset.coreFunctions
    }))
  }
}

export async function updateArrival(
  arrivalNumber: string,
  a: ArrivalForm
): Promise<ApiResponse<void>> {
  return api.put(
    `/arrivals/${arrivalNumber}`,
    {
      id: a.id,
      vendor: a.vendor,
      transporter: a.transporter,
      warehouse: getSelectedOrNull(a.warehouse),
      comment: a.comment,
      assets: a.assets.map(s => ({
        id: s.id,
        model: s.model,
        serialNumber: s.serialNumber,
        meterBlack: s.meterBlack,
        meterColour: s.meterColour,
        cassettes: s.cassettes,
        technicalStatus: getSelectedOrNull(s.technicalStatus),
        internalFinisher: s.internalFinisher,
        coreFunctions: s.coreFunctions
      }))
    },
    { headers: { "Content-Type": "application/json" } }
  )
    .then(() => ({ success: true as const, data: undefined }))
    .catch(apiErrorHandler<void>)
}

export async function createArrival(a: ArrivalForm): Promise<ApiResponse<CreateArrivalResponse>> {
  return api.post(
    '/arrivals',
    {
      vendor: a.vendor,
      transporter: a.transporter,
      warehouse: getSelectedOrNull(a.warehouse),
      comment: a.comment,
      assets: a.assets.map(s => ({
        model: s.model,
        serialNumber: s.serialNumber,
        meterBlack: s.meterBlack,
        meterColour: s.meterColour,
        cassettes: s.cassettes,
        technicalStatus: getSelectedOrNull(s.technicalStatus),
        internalFinisher: s.internalFinisher,
        coreFunctions: s.coreFunctions
      }))
    },
    { headers: { "Content-Type": "application/json" } }
  )
    .then((response: AxiosResponse<CreateArrivalResponse>) => ({
      success: true as const,
      data: response.data
    }))
    .catch(apiErrorHandler<CreateArrivalResponse>)
}