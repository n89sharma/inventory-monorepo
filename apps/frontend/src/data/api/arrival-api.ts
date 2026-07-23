import { api } from '@/data/api/axios-client'
import { useReferenceDataStore } from '@/data/store/reference-data-store'
import type { ArrivalForm, ArrivalMetadataForm, AssetForm } from '@/ui-types/arrival-form-types'
import {
  type SelectOption,
  getIdOrNullFromSelection,
  getSelectOption,
  getSelectedOrNull,
} from '@/ui-types/select-option-types'
import type {
  ArrivalDetail,
  ArrivalSummary,
  AssetDelta,
  AssetSummary,
  CollectionHistory,
  CreateArrival,
  CreateAsset,
  MoveArrivalAssets,
  OrgSummary,
  UpdateArrivalMetadata,
  UpdateAsset,
  Warehouse,
} from 'shared-types'
import {
  ArrivalDetailSchema,
  ArrivalSummarySchema,
  AssetDeltaSchema,
  AssetSummarySchema,
  CollectionHistorySchema,
  CreateArrivalSchema,
  CreateAssetSchema,
  MoveArrivalAssetsSchema,
  UpdateArrivalMetadataSchema,
  UpdateAssetSchema,
} from 'shared-types'
import { z } from 'zod'

const CreateArrivalResponseSchema = z.object({ arrivalNumber: z.string() })
type CreateArrivalResponse = z.infer<typeof CreateArrivalResponseSchema>

export async function getArrivals(
  fromDate: SelectOption<Date>,
  toDate: SelectOption<Date>,
  destination: SelectOption<Warehouse>,
  vendor: SelectOption<OrgSummary>,
): Promise<ArrivalSummary[]> {
  const { data } = await api.get<ArrivalSummary[]>(`/arrivals`, {
    params: {
      fromDate: getSelectedOrNull(fromDate),
      toDate: getSelectedOrNull(toDate),
      warehouse: getIdOrNullFromSelection(destination),
      vendor: getIdOrNullFromSelection(vendor),
    },
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
    assets: a.assets.map((s) => ({
      model: s.model!,
      serialNumber: s.serialNumber,
      meterBlack: s.meterBlack!,
      meterColour: s.meterColour!,
      cassettes: s.cassettes!,
      readiness: getSelectedOrNull(s.readiness)!,
      countryOfOrigin: s.countryOfOrigin,
      manufacturedYear: s.manufacturedYear,
      componentId: s.component?.id ?? null,
      coreFunctions: s.coreFunctions,
      drumLifeC: s.drumLifeC!,
      drumLifeM: s.drumLifeM!,
      drumLifeY: s.drumLifeY!,
      drumLifeK: s.drumLifeK!,
      tonerLifeC: s.tonerLifeC!,
      tonerLifeM: s.tonerLifeM!,
      tonerLifeY: s.tonerLifeY!,
      tonerLifeK: s.tonerLifeK!,
      errors: s.errors,
      comment: s.comment,
    })) as CreateArrival['assets'],
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
  metadata: ArrivalMetadataForm,
): Promise<void> {
  const updateArrivalMetadataBody = UpdateArrivalMetadataSchema.parse({
    vendor: metadata.vendor!,
    transporter: metadata.transporter!,
    warehouse: getSelectedOrNull(metadata.warehouse)!,
    comment: metadata.comment === '' ? null : metadata.comment,
  } satisfies UpdateArrivalMetadata)
  await api.patch(`/arrivals/${arrivalNumber}/metadata`, updateArrivalMetadataBody)
}

export async function patchArrivalAssets(arrivalNumber: string, delta: AssetDelta): Promise<void> {
  const patchArrivalAssetsBody = AssetDeltaSchema.parse(delta satisfies AssetDelta)
  await api.patch(`/arrivals/${arrivalNumber}/assets`, patchArrivalAssetsBody)
}

export async function moveArrivalAssets(
  destinationArrivalNumber: string,
  move: MoveArrivalAssets,
): Promise<void> {
  const moveArrivalAssetsBody = MoveArrivalAssetsSchema.parse(move satisfies MoveArrivalAssets)
  await api.post(`/arrivals/${destinationArrivalNumber}/move-assets`, moveArrivalAssetsBody)
}

export async function createSingleArrivalAsset(
  arrivalNumber: string,
  asset: AssetForm,
): Promise<AssetSummary> {
  const createSingleArrivalAssetBody = CreateAssetSchema.parse({
    model: asset.model!,
    serialNumber: asset.serialNumber,
    meterBlack: asset.meterBlack!,
    meterColour: asset.meterColour!,
    cassettes: asset.cassettes!,
    readiness: getSelectedOrNull(asset.readiness)!,
    countryOfOrigin: asset.countryOfOrigin,
    manufacturedYear: asset.manufacturedYear,
    componentId: asset.component?.id ?? null,
    coreFunctions: asset.coreFunctions,
    drumLifeC: asset.drumLifeC!,
    drumLifeM: asset.drumLifeM!,
    drumLifeY: asset.drumLifeY!,
    drumLifeK: asset.drumLifeK!,
    tonerLifeC: asset.tonerLifeC!,
    tonerLifeM: asset.tonerLifeM!,
    tonerLifeY: asset.tonerLifeY!,
    tonerLifeK: asset.tonerLifeK!,
    errors: asset.errors,
    comment: asset.comment,
  } satisfies CreateAsset)
  const { data } = await api.post<AssetSummary>(
    `/arrivals/${arrivalNumber}/assets`,
    createSingleArrivalAssetBody,
  )
  return AssetSummarySchema.parse(data)
}

export async function getArrivalAssetForUpdate(
  arrivalNumber: string,
  assetId: number,
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
    readiness: getSelectOption(asset.readiness),
    countryOfOrigin: asset.countryOfOrigin,
    manufacturedYear: asset.manufacturedYear,
    component:
      useReferenceDataStore.getState().components.find((c) => c.id === asset.componentId) ?? null,
    coreFunctions: asset.coreFunctions,
    drumLifeC: asset.drumLifeC,
    drumLifeM: asset.drumLifeM,
    drumLifeY: asset.drumLifeY,
    drumLifeK: asset.drumLifeK,
    tonerLifeC: asset.tonerLifeC,
    tonerLifeM: asset.tonerLifeM,
    tonerLifeY: asset.tonerLifeY,
    tonerLifeK: asset.tonerLifeK,
    errors: asset.errors,
    comment: asset.comment,
  }
}

export async function updateArrivalAsset(
  arrivalNumber: string,
  assetId: number,
  asset: AssetForm,
): Promise<AssetSummary> {
  const updateArrivalAssetBody = UpdateAssetSchema.parse({
    id: assetId,
    model: asset.model!,
    serialNumber: asset.serialNumber,
    meterBlack: asset.meterBlack!,
    meterColour: asset.meterColour!,
    cassettes: asset.cassettes!,
    readiness: getSelectedOrNull(asset.readiness)!,
    countryOfOrigin: asset.countryOfOrigin,
    manufacturedYear: asset.manufacturedYear,
    componentId: asset.component?.id ?? null,
    coreFunctions: asset.coreFunctions,
    drumLifeC: asset.drumLifeC!,
    drumLifeM: asset.drumLifeM!,
    drumLifeY: asset.drumLifeY!,
    drumLifeK: asset.drumLifeK!,
    tonerLifeC: asset.tonerLifeC!,
    tonerLifeM: asset.tonerLifeM!,
    tonerLifeY: asset.tonerLifeY!,
    tonerLifeK: asset.tonerLifeK!,
    errors: asset.errors,
    comment: asset.comment,
  } satisfies UpdateAsset)
  const { data } = await api.patch<AssetSummary>(
    `/arrivals/${arrivalNumber}/assets/${assetId}`,
    updateArrivalAssetBody,
  )
  return AssetSummarySchema.parse(data)
}
