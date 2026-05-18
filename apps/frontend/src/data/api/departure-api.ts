import { api } from '@/data/api/axios-client'
import type { DepartureForm } from '@/ui-types/departure-form-types'
import { type SelectOption, getIdOrNullFromSelection, getSelectOption, getSelectedOrNull } from '@/ui-types/select-option-types'
import type { AssetDelta, CollectionHistory, CreateDeparture, DepartureDetail, UpdateDeparture, Warehouse } from 'shared-types'
import { type DepartureSummary, AssetDeltaSchema, CollectionHistorySchema, CreateDepartureSchema, DepartureDetailSchema, DepartureSummarySchema, SubmitUpdateDepartureSchema, UpdateDepartureSchema } from 'shared-types'
import { z } from 'zod'

const CreateDepartureResponseSchema = z.object({ departureNumber: z.string() })
type CreateDepartureResponse = z.infer<typeof CreateDepartureResponseSchema>

export async function getDepartures(
  fromDate: SelectOption<Date>,
  toDate: SelectOption<Date>,
  origin: SelectOption<Warehouse>
): Promise<DepartureSummary[]> {
  const { data } = await api.get<DepartureSummary[]>(`/departures`, {
    params: {
      fromDate: getSelectedOrNull(fromDate),
      toDate: getSelectedOrNull(toDate),
      warehouse: getIdOrNullFromSelection(origin),
    }
  })
  return z.array(DepartureSummarySchema).parse(data)
}

export async function getDepartureDetail(departureNumber: string): Promise<DepartureDetail> {
  const { data } = await api.get<DepartureDetail>(`/departures/${departureNumber}`)
  return DepartureDetailSchema.parse(data)
}

export async function getDepartureHistory(departureNumber: string): Promise<CollectionHistory> {
  const { data } = await api.get<CollectionHistory>(`/departures/${departureNumber}/history`)
  return CollectionHistorySchema.parse(data)
}

export async function getDepartureForUpdate(departureNumber: string): Promise<DepartureForm> {
  const { data } = await api.get<UpdateDeparture>(`/departures/${departureNumber}/edit`)
  return mapUpdateDepartureToDepartureForm(UpdateDepartureSchema.parse(data))
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
  const createDepartureBody = CreateDepartureSchema.parse({
    origin: getSelectedOrNull(d.origin)!,
    customer: d.customer!,
    transporter: d.transporter!,
    comment: d.comment,
    assets: d.assets as CreateDeparture['assets']
  } satisfies CreateDeparture)
  const { data } = await api.post<CreateDepartureResponse>('/departures', createDepartureBody)
  return CreateDepartureResponseSchema.parse(data)
}

export async function updateDeparture(
  departureNumber: string,
  d: DepartureForm
): Promise<void> {
  const updateDepartureBody = SubmitUpdateDepartureSchema.parse({
    id: d.id!,
    origin: getSelectedOrNull(d.origin)!,
    customer: d.customer!,
    transporter: d.transporter!,
    comment: d.comment,
    assets: d.assets
  } satisfies UpdateDeparture)
  await api.put(`/departures/${departureNumber}`, updateDepartureBody)
}

export async function patchDepartureAssets(
  departureNumber: string,
  delta: AssetDelta
): Promise<void> {
  const patchDepartureAssetsBody = AssetDeltaSchema.parse(delta satisfies AssetDelta)
  await api.patch(`/departures/${departureNumber}/assets`, patchDepartureAssetsBody)
}
