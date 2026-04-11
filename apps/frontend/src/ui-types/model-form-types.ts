import type { AssetType, Brand } from 'shared-types'
import { BrandSchema } from 'shared-types'
import z from 'zod'
import { AssetTypeSelectOptionSchema, isSelected, type SelectOption } from './select-option-types'

export const ModelFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  weight: z.number().min(0),
  size: z.number().min(0),
  brand: BrandSchema.nullable().refine(val => !!val, 'Brand is required'),
  assetType: AssetTypeSelectOptionSchema.refine(val => isSelected(val), 'Asset type is required')
})

export type ModelForm = {
  name: string
  weight: number
  size: number
  brand: Brand | null
  assetType: SelectOption<AssetType>
}
