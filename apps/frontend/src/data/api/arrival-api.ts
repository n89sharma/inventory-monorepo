import { api } from '@/data/api/axios-client'
import type { ArrivalForm } from '@/ui-types/arrival-form-types'
import { type SelectOption, getIdOrNullFromSelection, getSelectOption, getSelectedOrNull } from '@/ui-types/select-option-types'
import type { ArrivalDetail, ArrivalSummary, CollectionHistory, UpdateArrival, Warehouse } from 'shared-types'
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
  const { data } = await api.get<{ success: true; data: ArrivalSummary[] }>(`/arrivals`, {
    params: {
      fromDate: getSelectedOrNull(fromDate),
      toDate: getSelectedOrNull(toDate),
      warehouse: getIdOrNullFromSelection(destination)
    }
  })
  return z.array(ArrivalSummarySchema).parse(data.data)
}

export async function getArrivalDetail(arrivalNumber: string): Promise<ArrivalDetail> {
  const { data } = await api.get<{ success: true; data: ArrivalDetail }>(`/arrivals/${arrivalNumber}`)
  return ArrivalDetailSchema.parse(data.data)
}

export async function getArrivalForUpdate(arrivalNumber: string): Promise<ArrivalForm> {
  const { data } = await api.get<{ success: true; data: UpdateArrival }>(`/arrivals/${arrivalNumber}/edit`)
  return mapUpdateArrivalToUiArrivalForm(UpdateArrivalSchema.parse(data.data))
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
): Promise<void> {
  await api.put(`/arrivals/${arrivalNumber}`, {
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
  })
}

export async function createArrival(a: ArrivalForm): Promise<CreateArrivalResponse> {
  return (await api.post<CreateArrivalResponse>('/arrivals', {
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
  })).data
}

export async function getArrivalHistory(arrivalNumber: string): Promise<CollectionHistory> {
  const { data } = await api.get<{ success: true; data: CollectionHistory }>(`/arrivals/${arrivalNumber}/history`)
  return data.data
}
