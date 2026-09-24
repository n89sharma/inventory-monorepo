import { RELEASE_AREA_LABELS, useReleaseAreaHrefs } from '@/components/whats-new/release-area-link'
import { ArrowRightIcon } from '@phosphor-icons/react'
import { RELEASE_SECTIONS, type ReleaseNote, type ReleaseSection } from 'shared-types'
import { Link } from 'react-router-dom'

const SECTION_LABELS = {
  new: 'New',
  improved: 'Improved',
  fixed: 'Fixed',
} as const satisfies Record<ReleaseSection, string>

type NoteProps = { note: ReleaseNote }

function NoteHeading({ note }: NoteProps) {
  const areaHrefs = useReleaseAreaHrefs()
  if (note.heading === null) return null

  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <h4 className="text-sm font-semibold">{note.heading}</h4>
      {note.link_area !== null && (
        <Link
          to={areaHrefs[note.link_area]}
          className="text-primary inline-flex items-center gap-1 text-sm hover:underline"
        >
          Go to {RELEASE_AREA_LABELS[note.link_area]}
          <ArrowRightIcon aria-hidden="true" />
        </Link>
      )}
    </div>
  )
}

function Note({ note }: NoteProps) {
  return (
    <div className="space-y-1">
      <NoteHeading note={note} />
      <ul className="text-muted-foreground list-disc space-y-1 pl-5 text-sm">
        {note.bullets.map((bullet) => (
          <li key={bullet}>{bullet}</li>
        ))}
      </ul>
    </div>
  )
}

type SectionProps = { section: ReleaseSection; notes: ReleaseNote[] }

function Section({ section, notes }: SectionProps) {
  if (notes.length === 0) return null

  return (
    <section className="space-y-3">
      <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {SECTION_LABELS[section]}
      </h3>
      {notes.map((note) => (
        <Note key={note.id} note={note} />
      ))}
    </section>
  )
}

export function ReleaseNoteSections({ notes }: { notes: ReleaseNote[] }) {
  return (
    <div className="space-y-5">
      {RELEASE_SECTIONS.map((section) => (
        <Section
          key={section}
          section={section}
          notes={notes.filter((note) => note.section === section)}
        />
      ))}
    </div>
  )
}
