import { api } from '@/data/api/axios-client'
import { apiErrorHandler } from '@/lib/error-handler'
import type { AxiosResponse } from 'axios'
import type { ApiResponse, Warehouse } from 'shared-types'
import { ArrivalDetailSchema, ArrivalSummarySchema, EditArrivalSchema, getIdOrNullFromSelection, getSelectedOrNull, type ArrivalDetail, type ArrivalForm, type ArrivalSummary, type EditArrival, type SelectOption } from 'shared-types'
import { z } from 'zod'

interface CreateArrivalResponse {
  arrivalNumber: string
}

export async function getArrivals(
  fromDate: SelectOption<Date>,
  toDate: SelectOption<Date>,
  destination: SelectOption<Warehouse>
): Promise<ArrivalSummary[]> {

  const res = await api.get(`/arrivals`, {
    params: {
      fromDate: getSelectedOrNull(fromDate),
      toDate: getSelectedOrNull(toDate),
      warehouse: getIdOrNullFromSelection(destination)
    }
  })
  return z.array(ArrivalSummarySchema).parse(res.data)
}

export async function getArrivalDetail(arrivalNumber: string): Promise<ArrivalDetail> {
  const res = await api.get(`/arrivals/${arrivalNumber}`)
  return ArrivalDetailSchema.parse(res.data)
}

export async function getArrivalForEdit(arrivalNumber: string): Promise<EditArrival> {
  const res = await api.get(`/arrivals/${arrivalNumber}/edit`)
  return EditArrivalSchema.parse(res.data)
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