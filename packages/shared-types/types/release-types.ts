import { z } from 'zod'
import { PermissionSchema } from './permissions.js'

export const RELEASE_SECTIONS = ['new', 'improved', 'fixed'] as const
export type ReleaseSection = (typeof RELEASE_SECTIONS)[number]
export const ReleaseSectionSchema = z.enum(RELEASE_SECTIONS)

// Where a note's "Go to" link points. The key is stored; the route is resolved in
// the frontend from the same builders the sidebar uses, so links carry default filters.
export const RELEASE_LINK_AREAS = [
  'arrivals',
  'holds',
  'transfers',
  'departures',
  'invoices',
  'store',
  'onhand_assets',
  'departed_assets',
  'reports',
  'settings',
] as const
export type ReleaseLinkArea = (typeof RELEASE_LINK_AREAS)[number]
export const ReleaseLinkAreaSchema = z.enum(RELEASE_LINK_AREAS)

const MAX_BULLET_LENGTH = 300
const MAX_HEADING_LENGTH = 120

export const ReleaseNoteSchema = z.object({
  id: z.int(),
  section: ReleaseSectionSchema,
  heading: z.string().nullable(),
  link_area: ReleaseLinkAreaSchema.nullable(),
  permission_key: PermissionSchema.nullable(),
  bullets: z.array(z.string()),
  sort_order: z.int(),
})
export type ReleaseNote = z.infer<typeof ReleaseNoteSchema>

export const ReleaseSchema = z.object({
  id: z.int(),
  published_at: z.coerce.date(),
  unread: z.boolean(),
  notes: z.array(ReleaseNoteSchema),
})
export type Release = z.infer<typeof ReleaseSchema>

export const AdminReleaseSchema = z.object({
  id: z.int(),
  version: z.string().nullable(),
  published_at: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
  created_by_name: z.string(),
  notes: z.array(ReleaseNoteSchema),
})
export type AdminRelease = z.infer<typeof AdminReleaseSchema>

export const SaveReleaseNoteSchema = z.object({
  section: ReleaseSectionSchema,
  heading: z.string().max(MAX_HEADING_LENGTH).nullable(),
  link_area: ReleaseLinkAreaSchema.nullable(),
  permission_key: PermissionSchema.nullable(),
  bullets: z.array(z.string().trim().min(1).max(MAX_BULLET_LENGTH)).min(1),
})
export type SaveReleaseNote = z.infer<typeof SaveReleaseNoteSchema>

export const SaveReleaseSchema = z.object({
  version: z.string().trim().max(50).nullable(),
  published_at: z.iso.datetime().nullable(),
  notes: z.array(SaveReleaseNoteSchema),
})
export type SaveRelease = z.infer<typeof SaveReleaseSchema>

export const UpdateLastSeenReleaseSchema = z.object({
  release_id: z.int(),
})
export type UpdateLastSeenRelease = z.infer<typeof UpdateLastSeenReleaseSchema>
