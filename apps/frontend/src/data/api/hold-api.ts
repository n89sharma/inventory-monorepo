import { api } from '@/data/api/axios-client'
import type { HoldForm, HoldMetadataForm } from '@/ui-types/hold-form-types'
import {
  getIdOrNullFromSelection,
  getSelectedOrNull,
  type SelectOption,
} from '@/ui-types/select-option-types'
import type {
  AssetDelta,
  CollectionHistory,
  CreateHold,
  HoldDetail,
  OrgSummary,
  UpdateHoldMetadata,
  User,
} from 'shared-types'
import {
  AssetDeltaSchema,
  CollectionHistorySchema,
  CreateHoldSchema,
  HoldDetailSchema,
  HoldSummarySchema,
  UpdateHoldMetadataSchema,
  type HoldSummary,
} from 'shared-types'
import { z } from 'zod'

const CreateHoldResponseSchema = z.object({ holdNumber: z.string() })
type CreateHoldResponse = z.infer<typeof CreateHoldResponseSchema>

export async function getHolds(
  fromDate: SelectOption<Date>,
  toDate: SelectOption<Date>,
  holdBy: SelectOption<User>,
  holdFor: SelectOption<User>,
  customer: SelectOption<OrgSummary>,
): Promise<HoldSummary[]> {
  const { data } = await api.get<HoldSummary[]>(`/holds`, {
    params: {
      fromDate: getSelectedOrNull(fromDate),
      toDate: getSelectedOrNull(toDate),
      holdBy: getIdOrNullFromSelection(holdBy),
      holdFor: getIdOrNullFromSelection(holdFor),
      customer: getIdOrNullFromSelection(customer),
    },
  })
  return z.array(HoldSummarySchema).parse(data)
}

export async function createHold(d: HoldForm): Promise<CreateHoldResponse> {
  const createHoldBody = CreateHoldSchema.parse({
    created_for_id: getIdOrNullFromSelection(d.created_for)!,
    customer_id: d.customer!.id,
    notes: d.notes || null,
    assets: d.assets as CreateHold['assets'],
  } satisfies CreateHold)
  const { data } = await api.post<CreateHoldResponse>('/holds', createHoldBody)
  return CreateHoldResponseSchema.parse(data)
}

export async function getHoldDetail(holdNumber: string): Promise<HoldDetail> {
  const { data } = await api.get<HoldDetail>(`/holds/${holdNumber}`)
  return HoldDetailSchema.parse(data)
}

export async function archiveHold(holdNumber: string): Promise<void> {
  await api.patch(`/holds/${holdNumber}/archive`)
}

export async function getHoldHistory(holdNumber: string): Promise<CollectionHistory> {
  const { data } = await api.get<CollectionHistory>(`/holds/${holdNumber}/history`)
  return CollectionHistorySchema.parse(data)
}

export async function updateHoldMetadata(
  holdNumber: string,
  metadata: HoldMetadataForm,
): Promise<void> {
  const updateHoldMetadataBody = UpdateHoldMetadataSchema.parse({
    created_for: getSelectedOrNull(metadata.created_for)!,
    customer: metadata.customer!,
    notes: metadata.notes === '' ? null : metadata.notes,
  } satisfies UpdateHoldMetadata)
  await api.patch(`/holds/${holdNumber}/metadata`, updateHoldMetadataBody)
}

export async function patchHoldAssets(holdNumber: string, delta: AssetDelta): Promise<void> {
  const patchHoldAssetsBody = AssetDeltaSchema.parse(delta satisfies AssetDelta)
  await api.patch(`/holds/${holdNumber}/assets`, patchHoldAssetsBody)
}
