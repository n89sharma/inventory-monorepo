import type { AssetType, Brand, ModelSummary } from 'shared-types'
import { BrandSchema } from 'shared-types'
import z from 'zod'
import {
  AssetTypeSelectOptionSchema,
  getSelectOption,
  isSelected,
  UNSELECTED,
  type SelectOption,
} from './select-option-types'

export const ModelFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  weight: z.number().min(0),
  size: z.number().min(0),
  brand: BrandSchema.nullable().refine((val) => !!val, 'Brand is required'),
  assetType: AssetTypeSelectOptionSchema.refine((val) => isSelected(val), 'Asset type is required'),
  is_colour: z.boolean(),
})

export type ModelForm = {
  name: string
  weight: number
  size: number
  brand: Brand | null
  assetType: SelectOption<AssetType>
  is_colour: boolean
}

// asset_type_id is what makes this prefill possible: matching on the display string would break
// as soon as either side stops normalising the casing.
export function toModelFormValues(
  model: ModelSummary,
  brands: Brand[],
  assetTypes: AssetType[],
): ModelForm {
  const assetType = assetTypes.find((type) => type.id === model.asset_type_id)
  return {
    name: model.model_name,
    weight: model.weight,
    size: model.size,
    brand: brands.find((brand) => brand.id === model.brand_id) ?? null,
    assetType: assetType ? getSelectOption(assetType) : UNSELECTED,
    is_colour: model.is_colour,
  }
}
