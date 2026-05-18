import { api } from '@/data/api/axios-client'
import type { ArrivalForm } from '@/ui-types/arrival-form-types'
import { type SelectOption, getIdOrNullFromSelection, getSelectOption, getSelectedOrNull } from '@/ui-types/select-option-types'
import type { ArrivalDetail, ArrivalSummary, AssetDelta, CollectionHistory, CreateArrival, UpdateArrival, Warehouse } from 'shared-types'
import { ArrivalDetailSchema, ArrivalSummarySchema, AssetDeltaSchema, CollectionHistorySchema, CreateArrivalSchema, SubmitUpdateArrivalSchema, UpdateArrivalSchema } from 'shared-types'
import { z } from 'zod'

const CreateArrivalResponseSchema = z.object({ arrivalNumber: z.string() })
type CreateArrivalResponse = z.infer<typeof CreateArrivalResponseSchema>

export async function getArrivals(
  fromDate: SelectOption<Date>,
  toDate: SelectOption<Date>,
  destination: SelectOption<Warehouse>
): Promise<ArrivalSummary[]> {
  const { data } = await api.get<ArrivalSummary[]>(`/arrivals`, {
    params: {
      fromDate: getSelectedOrNull(fromDate),
      toDate: getSelectedOrNull(toDate),
      warehouse: getIdOrNullFromSelection(destination)
    }
  })
  return z.array(ArrivalSummarySchema).parse(data)
}

export async function getArrivalDetail(arrivalNumber: string): Promise<ArrivalDetail> {
  const { data } = await api.get<ArrivalDetail>(`/arrivals/${arrivalNumber}`)
  return ArrivalDetailSchema.parse(data)
}

export async function getArrivalForUpdate(arrivalNumber: string): Promise<ArrivalForm> {
  const { data } = await api.get<UpdateArrival>(`/arrivals/${arrivalNumber}/edit`)
  return mapUpdateArrivalToUiArrivalForm(UpdateArrivalSchema.parse(data))
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
  const updateArrivalBody = SubmitUpdateArrivalSchema.parse({
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
  await api.put(`/arrivals/${arrivalNumber}`, updateArrivalBody)
}

export async function createArrival(a: ArrivalForm): Promise<CreateArrivalResponse> {
  const createArrivalBody = CreateArrivalSchema.parse({
    vendor: a.vendor!,
    transporter: a.transporter!,
    warehouse: getSelectedOrNull(a.warehouse)!,
    comment: a.comment,
    assets: a.assets.map(s => ({
      model: s.model!,
      serialNumber: s.serialNumber,
      meterBlack: s.meterBlack!,
      meterColour: s.meterColour!,
      cassettes: s.cassettes!,
      technicalStatus: getSelectedOrNull(s.technicalStatus)!,
      internalFinisher: s.internalFinisher,
      coreFunctions: s.coreFunctions
    })) as CreateArrival['assets']
  } satisfies CreateArrival)
  const { data } = await api.post<CreateArrivalResponse>('/arrivals', createArrivalBody)
  return CreateArrivalResponseSchema.parse(data)
}

export async function getArrivalHistory(arrivalNumber: string): Promise<CollectionHistory> {
  const { data } = await api.get<CollectionHistory>(`/arrivals/${arrivalNumber}/history`)
  return CollectionHistorySchema.parse(data)
}

export async function patchArrivalAssets(
  arrivalNumber: string,
  delta: AssetDelta
): Promise<void> {
  const patchArrivalAssetsBody = AssetDeltaSchema.parse(delta satisfies AssetDelta)
  await api.patch(`/arrivals/${arrivalNumber}/assets`, patchArrivalAssetsBody)
}
