import { api } from '@/data/api/axios-client'
import type { DepartureForm } from '@/ui-types/departure-form-types'
import { type SelectOption, getIdOrNullFromSelection, getSelectOption, getSelectedOrNull } from '@/ui-types/select-option-types'
import type { CollectionHistory, DepartureDetail, UpdateDeparture, Warehouse } from 'shared-types'
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
  const { data } = await api.get<{ success: true; data: DepartureSummary[] }>(`/departures`, {
    params: {
      fromDate: getSelectedOrNull(fromDate),
      toDate: getSelectedOrNull(toDate),
      warehouse: getIdOrNullFromSelection(origin),
    }
  })
  return z.array(DepartureSummarySchema).parse(data.data)
}

export async function getDepartureDetail(departureNumber: string): Promise<DepartureDetail> {
  const { data } = await api.get<{ success: true; data: DepartureDetail }>(`/departures/${departureNumber}`)
  return DepartureDetailSchema.parse(data.data)
}

export async function getDepartureHistory(departureNumber: string): Promise<CollectionHistory> {
  const { data } = await api.get<{ success: true; data: CollectionHistory }>(`/departures/${departureNumber}/history`)
  return data.data
}

export async function getDepartureForUpdate(departureNumber: string): Promise<DepartureForm> {
  const { data } = await api.get<{ success: true; data: UpdateDeparture }>(`/departures/${departureNumber}/edit`)
  return mapUpdateDepartureToDepartureForm(UpdateDepartureSchema.parse(data.data))
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

export async function createDeparture(d: DepartureForm): Promise<CreateDepartureResponse> {
  return (await api.post<CreateDepartureResponse>('/departures', {
    origin: getSelectedOrNull(d.origin),
    customer: d.customer,
    transporter: d.transporter,
    comment: d.comment,
    assets: d.assets
  })).data
}

export async function updateDeparture(
  departureNumber: string,
  d: DepartureForm
): Promise<void> {
  await api.put(`/departures/${departureNumber}`, {
    id: d.id,
    origin: getSelectedOrNull(d.origin),
    customer: d.customer,
    transporter: d.transporter,
    comment: d.comment,
    assets: d.assets
  })
}
