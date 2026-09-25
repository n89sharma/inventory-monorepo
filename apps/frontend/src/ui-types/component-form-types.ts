import type { Brand, ComponentSummary } from 'shared-types'
import { BrandSchema } from 'shared-types'
import z from 'zod'

export const ComponentFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  brand: BrandSchema.nullable().refine((val) => !!val, 'Brand is required'),
  is_active: z.boolean(),
})

export type ComponentForm = {
  name: string
  brand: Brand | null
  is_active: boolean
}

export function toComponentFormValues(component: ComponentSummary, brands: Brand[]): ComponentForm {
  return {
    name: component.name,
    brand: brands.find((brand) => brand.id === component.brand_id) ?? null,
    is_active: component.is_active,
  }
}
