import { api } from '@/data/api/axios-client'
import type { ArrivalForm, ArrivalMetadataForm, AssetForm } from '@/ui-types/arrival-form-types'
import { type SelectOption, getIdOrNullFromSelection, getSelectOption, getSelectedOrNull } from '@/ui-types/select-option-types'
import type { ArrivalDetail, ArrivalSummary, AssetDelta, AssetSummary, CollectionHistory, CreateArrival, CreateAsset, UpdateArrivalMetadata, UpdateAsset, Warehouse } from 'shared-types'
import { ArrivalDetailSchema, ArrivalSummarySchema, AssetDeltaSchema, AssetSummarySchema, CollectionHistorySchema, CreateArrivalSchema, CreateAssetSchema, UpdateArrivalMetadataSchema, UpdateAssetSchema } from 'shared-types'
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

export async function updateArrivalMetadata(
  arrivalNumber: string,
  metadata: ArrivalMetadataForm
): Promise<void> {
  const updateArrivalMetadataBody = UpdateArrivalMetadataSchema.parse({
    vendor: metadata.vendor!,
    transporter: metadata.transporter!,
    warehouse: getSelectedOrNull(metadata.warehouse)!,
    comment: metadata.comment === '' ? null : metadata.comment
  } satisfies UpdateArrivalMetadata)
  await api.patch(`/arrivals/${arrivalNumber}/metadata`, updateArrivalMetadataBody)
}

export async function patchArrivalAssets(
  arrivalNumber: string,
  delta: AssetDelta
): Promise<void> {
  const patchArrivalAssetsBody = AssetDeltaSchema.parse(delta satisfies AssetDelta)
  await api.patch(`/arrivals/${arrivalNumber}/assets`, patchArrivalAssetsBody)
}

export async function createSingleArrivalAsset(
  arrivalNumber: string,
  asset: AssetForm
): Promise<AssetSummary> {
  const createSingleArrivalAssetBody = CreateAssetSchema.parse({
    model: asset.model!,
    serialNumber: asset.serialNumber,
    meterBlack: asset.meterBlack!,
    meterColour: asset.meterColour!,
    cassettes: asset.cassettes!,
    technicalStatus: getSelectedOrNull(asset.technicalStatus)!,
    internalFinisher: asset.internalFinisher,
    coreFunctions: asset.coreFunctions
  } satisfies CreateAsset)
  const { data } = await api.post<AssetSummary>(`/arrivals/${arrivalNumber}/assets`, createSingleArrivalAssetBody)
  return AssetSummarySchema.parse(data)
}

export async function getArrivalAssetForUpdate(
  arrivalNumber: string,
  assetId: number
): Promise<AssetForm> {
  const { data } = await api.get<UpdateAsset>(`/arrivals/${arrivalNumber}/assets/${assetId}/edit`)
  return mapUpdateAssetToAssetForm(UpdateAssetSchema.parse(data))
}

function mapUpdateAssetToAssetForm(asset: UpdateAsset): AssetForm {
  return {
    id: asset.id,
    model: asset.model,
    serialNumber: asset.serialNumber,
    meterBlack: asset.meterBlack,
    meterColour: asset.meterColour,
    cassettes: asset.cassettes,
    technicalStatus: getSelectOption(asset.technicalStatus),
    internalFinisher: asset.internalFinisher,
    coreFunctions: asset.coreFunctions
  }
}

export async function updateArrivalAsset(
  arrivalNumber: string,
  assetId: number,
  asset: AssetForm
): Promise<AssetSummary> {
  const updateArrivalAssetBody = UpdateAssetSchema.parse({
    id: assetId,
    model: asset.model!,
    serialNumber: asset.serialNumber,
    meterBlack: asset.meterBlack!,
    meterColour: asset.meterColour!,
    cassettes: asset.cassettes!,
    technicalStatus: getSelectedOrNull(asset.technicalStatus)!,
    internalFinisher: asset.internalFinisher,
    coreFunctions: asset.coreFunctions
  } satisfies UpdateAsset)
  const { data } = await api.patch<AssetSummary>(`/arrivals/${arrivalNumber}/assets/${assetId}`, updateArrivalAssetBody)
  return AssetSummarySchema.parse(data)
}
