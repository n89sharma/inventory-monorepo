import z from 'zod'

export const OrgFormSchema = z.object({
  account_number: z.string().min(1, 'Account number is required'),
  name: z.string().min(1, 'Name is required'),
  contact_name: z.string().nullable(),
  phone: z.string().nullable(),
  mobile: z.string().nullable(),
  primary_email: z.string().nullable(),
  address: z.string().nullable(),
  city: z.string().nullable(),
  province: z.string().nullable(),
  country: z.string().nullable(),
})

export type OrgForm = z.infer<typeof OrgFormSchema>
