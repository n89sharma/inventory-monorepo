import { api } from '@/data/api/axios-client'
import type { HoldForm } from '@/ui-types/hold-form-types'
import { getIdOrNullFromSelection, getSelectOption, getSelectedOrNull, type SelectOption } from '@/ui-types/select-option-types'
import type { AssetDelta, CollectionHistory, CreateHold, HoldDetail, UpdateHold, User } from 'shared-types'
import { AssetDeltaSchema, CollectionHistorySchema, CreateHoldSchema, HoldDetailSchema, HoldSummarySchema, SubmitUpdateHoldSchema, UpdateHoldSchema, type HoldSummary } from 'shared-types'
import { z } from 'zod'

const CreateHoldResponseSchema = z.object({ holdNumber: z.string() })
type CreateHoldResponse = z.infer<typeof CreateHoldResponseSchema>

const UpdateHoldResponseSchema = z.object({ holdNumber: z.string() })

export async function getHolds(
  fromDate: SelectOption<Date>,
  toDate: SelectOption<Date>,
  holdBy: SelectOption<User>,
  holdFor: SelectOption<User>
): Promise<HoldSummary[]> {
  const { data } = await api.get<HoldSummary[]>(`/holds`, {
    params: {
      fromDate: getSelectedOrNull(fromDate),
      toDate: getSelectedOrNull(toDate),
      holdBy: getIdOrNullFromSelection(holdBy),
      holdFor: getIdOrNullFromSelection(holdFor)
    }
  })
  return z.array(HoldSummarySchema).parse(data)
}

export async function createHold(d: HoldForm): Promise<CreateHoldResponse> {
  const createHoldBody = CreateHoldSchema.parse({
    created_for_id: getIdOrNullFromSelection(d.created_for)!,
    customer_id: d.customer!.id,
    notes: d.notes || null,
    assets: d.assets as CreateHold['assets']
  } satisfies CreateHold)
  const { data } = await api.post<CreateHoldResponse>('/holds', createHoldBody)
  return CreateHoldResponseSchema.parse(data)
}

export async function getHoldForUpdate(holdNumber: string): Promise<HoldForm> {
  const { data } = await api.get<UpdateHold>(`/holds/${holdNumber}/edit`)
  return mapUpdateHoldToHoldForm(UpdateHoldSchema.parse(data))
}

export function mapUpdateHoldToHoldForm(hold: UpdateHold): HoldForm {
  return {
    id: hold.id,
    created_for: getSelectOption(hold.created_for),
    customer: hold.customer,
    notes: hold.notes ?? '',
    assets: hold.assets
  }
}

export async function updateHold(
  holdNumber: string,
  d: HoldForm
): Promise<{ holdNumber: string }> {
  const updateHoldBody = SubmitUpdateHoldSchema.parse({
    id: d.id!,
    created_for: getSelectedOrNull(d.created_for)!,
    customer: d.customer!,
    notes: d.notes || null,
    assets: d.assets
  } satisfies UpdateHold)
  const { data } = await api.put<{ holdNumber: string }>(`/holds/${holdNumber}`, updateHoldBody)
  return UpdateHoldResponseSchema.parse(data)
}

export async function getHoldDetail(holdNumber: string): Promise<HoldDetail> {
  const { data } = await api.get<HoldDetail>(`/holds/${holdNumber}`)
  return HoldDetailSchema.parse(data)
}

export async function getHoldHistory(holdNumber: string): Promise<CollectionHistory> {
  const { data } = await api.get<CollectionHistory>(`/holds/${holdNumber}/history`)
  return CollectionHistorySchema.parse(data)
}

export async function patchHoldAssets(
  holdNumber: string,
  delta: AssetDelta
): Promise<void> {
  const patchHoldAssetsBody = AssetDeltaSchema.parse(delta satisfies AssetDelta)
  await api.patch(`/holds/${holdNumber}/assets`, patchHoldAssetsBody)
}
