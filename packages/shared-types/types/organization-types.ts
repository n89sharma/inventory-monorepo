import { z } from 'zod'

export const OrgSummarySchema = z.object({
  id: z.number(),
  account_number: z.string().nullable(),
  name: z.string(),
})

export const OrgDetailSchema = z.object({
  id: z.number(),
  account_number: z.string().nullable(),
  name: z.string(),
  contact_name: z.string().nullable(),
  phone: z.string().nullable(),
  mobile: z.string().nullable(),
  primary_email: z.string().nullable(),
  address: z.string().nullable(),
  city: z.string().nullable(),
  province: z.string().nullable(),
  country: z.string().nullable(),
})

export type OrgSummary = z.infer<typeof OrgSummarySchema>
export type OrgDetail = z.infer<typeof OrgDetailSchema>

export const CreateOrgSchema = z.object({
  account_number: z.string().nullable(),
  name: z.string().min(1),
  contact_name: z.string().nullable(),
  phone: z.string().nullable(),
  mobile: z.string().nullable(),
  primary_email: z.string().nullable(),
  address: z.string().nullable(),
  city: z.string().nullable(),
  province: z.string().nullable(),
  country: z.string().nullable(),
})

export type CreateOrg = z.infer<typeof CreateOrgSchema>

// PATCH /organizations/:orgId
export const UpdateOrgSchema = z.object({
  account_number: z.string().nullable(),
  name: z.string().min(1),
  contact_name: z.string().nullable(),
  phone: z.string().nullable(),
  mobile: z.string().nullable(),
  primary_email: z.string().nullable(),
  address: z.string().nullable(),
  city: z.string().nullable(),
  province: z.string().nullable(),
  country: z.string().nullable(),
})

export type UpdateOrg = z.infer<typeof UpdateOrgSchema>

// GET /organizations/merge-preview?ids=
export const OrgMergeCandidateSchema = z.object({
  id: z.number(),
  name: z.string(),
  account_number: z.string().nullable(),
  reference_count: z.number(),
})

export const OrgMergePreviewSchema = z.object({
  winner_id: z.number(),
  candidates: z.array(OrgMergeCandidateSchema),
})

// POST /organizations/merge
export const MergeOrgSchema = z.object({
  ids: z.array(z.number()).min(2),
  organization: UpdateOrgSchema,
})

export type OrgMergeCandidate = z.infer<typeof OrgMergeCandidateSchema>
export type OrgMergePreview = z.infer<typeof OrgMergePreviewSchema>
export type MergeOrg = z.infer<typeof MergeOrgSchema>
