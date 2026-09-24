import { ReleaseNoteSections } from '@/components/whats-new/release-note-sections'
import { useReleases } from '@/hooks/use-release'
import { formatDate } from '@/lib/formatters'
import type { Release } from 'shared-types'

function ReleaseRow({ release }: { release: Release }) {
  return (
    <article className="grid gap-2 border-b py-8 first:pt-0 last:border-b-0 sm:grid-cols-[9rem_1fr] sm:gap-8">
      <div className="text-muted-foreground self-start text-sm sm:sticky sm:top-4">
        {formatDate(release.published_at)}
      </div>
      <ReleaseNoteSections notes={release.notes} />
    </article>
  )
}

export function WhatsNewPage() {
  const releases = useReleases()

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-8">
      <h1 className="mb-8 text-xl font-semibold">What&apos;s new</h1>
      {releases.length === 0 && <p className="text-muted-foreground text-sm">No updates yet.</p>}
      {releases.map((release) => (
        <ReleaseRow key={release.id} release={release} />
      ))}
    </div>
  )
}
