import z from 'zod'

export const BrandFormSchema = z.object({
  name: z.string().min(1, 'Name is required')
})

export type BrandForm = z.infer<typeof BrandFormSchema>
