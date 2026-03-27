import { z } from 'zod';

export const OrgSummarySchema = z.object({
  id: z.number(),
  account_number: z.string(),
  name: z.string()
});

export const OrgDetailSchema = z.object({
  id: z.number(),
  account_number: z.string(),
  name: z.string(),
  contact_name: z.string().nullable(),
  phone: z.string().nullable(),
  mobile: z.string().nullable(),
  primary_email: z.string().nullable(),
  address: z.string().nullable(),
  city: z.string().nullable(),
  province: z.string().nullable(),
  country: z.string().nullable(),
});

export type OrgSummary = z.infer<typeof OrgSummarySchema>;
export type OrgDetail = z.infer<typeof OrgDetailSchema>;
