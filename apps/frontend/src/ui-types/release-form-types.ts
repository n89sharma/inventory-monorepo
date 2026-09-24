import { RELEASE_LINK_AREAS, RELEASE_SECTIONS, PERMISSIONS } from 'shared-types'
import type { ReleaseNote, SaveReleaseNote } from 'shared-types'
import z from 'zod'

// Radix Select rejects an empty string value, so "no link" / "everyone" need a real one.
export const NONE_VALUE = 'none'

const LinkAreaFieldSchema = z.enum([NONE_VALUE, ...RELEASE_LINK_AREAS])
const PermissionFieldSchema = z.enum([NONE_VALUE, ...PERMISSIONS])

const ReleaseNoteFormSchema = z.object({
  section: z.enum(RELEASE_SECTIONS),
  heading: z.string(),
  link_area: LinkAreaFieldSchema,
  permission_key: PermissionFieldSchema,
  // One bullet per line: an admin writes a note as fast as they type it.
  bullets: z.string().refine((value) => toBullets(value).length > 0, 'At least one bullet'),
})

export const ReleaseFormSchema = z.object({
  version: z.string(),
  published_on: z.string(),
  notes: z.array(ReleaseNoteFormSchema),
})
export type ReleaseForm = z.infer<typeof ReleaseFormSchema>
export type ReleaseNoteForm = z.infer<typeof ReleaseNoteFormSchema>

function toBullets(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
}

export function toSaveNote(note: ReleaseNoteForm): SaveReleaseNote {
  const heading = note.heading.trim()
  return {
    section: note.section,
    heading: heading.length > 0 ? heading : null,
    link_area: note.link_area === NONE_VALUE ? null : note.link_area,
    permission_key: note.permission_key === NONE_VALUE ? null : note.permission_key,
    bullets: toBullets(note.bullets),
  }
}

export function toNoteFormValues(note: ReleaseNote): ReleaseNoteForm {
  return {
    section: note.section,
    heading: note.heading ?? '',
    link_area: note.link_area ?? NONE_VALUE,
    permission_key: note.permission_key ?? NONE_VALUE,
    bullets: note.bullets.join('\n'),
  }
}

export const EMPTY_NOTE: ReleaseNoteForm = {
  section: 'new',
  heading: '',
  link_area: NONE_VALUE,
  permission_key: NONE_VALUE,
  bullets: '',
}
