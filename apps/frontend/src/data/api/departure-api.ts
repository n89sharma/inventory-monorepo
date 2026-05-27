import { api } from '@/data/api/axios-client'
import type { DepartureForm, DepartureMetadataForm } from '@/ui-types/departure-form-types'
import { type SelectOption, getIdOrNullFromSelection, getSelectedOrNull } from '@/ui-types/select-option-types'
import type { AssetDelta, CollectionHistory, CreateDeparture, DepartureDetail, OrgSummary, UpdateDepartureMetadata, Warehouse } from 'shared-types'
import { type DepartureSummary, AssetDeltaSchema, CollectionHistorySchema, CreateDepartureSchema, DepartureDetailSchema, DepartureSummarySchema, UpdateDepartureMetadataSchema } from 'shared-types'
import { z } from 'zod'

const CreateDepartureResponseSchema = z.object({ departureNumber: z.string() })
type CreateDepartureResponse = z.infer<typeof CreateDepartureResponseSchema>

export async function getDepartures(
  fromDate: SelectOption<Date>,
  toDate: SelectOption<Date>,
  origin: SelectOption<Warehouse>,
  customer: SelectOption<OrgSummary>
): Promise<DepartureSummary[]> {
  const { data } = await api.get<DepartureSummary[]>(`/departures`, {
    params: {
      fromDate: getSelectedOrNull(fromDate),
      toDate: getSelectedOrNull(toDate),
      warehouse: getIdOrNullFromSelection(origin),
      customer: getIdOrNullFromSelection(customer),
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

export async function patchDepartureAssets(
  departureNumber: string,
  delta: AssetDelta
): Promise<void> {
  const patchDepartureAssetsBody = AssetDeltaSchema.parse(delta satisfies AssetDelta)
  await api.patch(`/departures/${departureNumber}/assets`, patchDepartureAssetsBody)
}

export async function updateDepartureMetadata(
  departureNumber: string,
  metadata: DepartureMetadataForm
): Promise<void> {
  const updateDepartureMetadataBody = UpdateDepartureMetadataSchema.parse({
    origin: getSelectedOrNull(metadata.origin)!,
    customer: metadata.customer!,
    transporter: metadata.transporter!,
    comment: metadata.comment === '' ? null : metadata.comment
  } satisfies UpdateDepartureMetadata)
  await api.patch(`/departures/${departureNumber}/metadata`, updateDepartureMetadataBody)
}
