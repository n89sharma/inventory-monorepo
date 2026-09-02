import type { OrgDetail } from 'shared-types'
import z from 'zod'

export const OrgFormSchema = z.object({
  account_number: z.string().nullable(),
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

export function toOrgFormValues(org: OrgDetail): OrgForm {
  return {
    account_number: org.account_number,
    name: org.name,
    contact_name: org.contact_name,
    phone: org.phone,
    mobile: org.mobile,
    primary_email: org.primary_email,
    address: org.address,
    city: org.city,
    province: org.province,
    country: org.country,
  }
}
