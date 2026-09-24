import { Button } from '@/components/shadcn/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/shadcn/dialog'
import { ReleaseNoteSections } from '@/components/whats-new/release-note-sections'
import { WHATS_NEW_PATH } from '@/components/whats-new/whats-new-path'
import { useReleaseMutations } from '@/hooks/use-release-mutations'
import { useReleases } from '@/hooks/use-release'
import { formatDate } from '@/lib/formatters'
import { useState } from 'react'
import type { Release } from 'shared-types'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

function countBullets(release: Release, section: 'improved' | 'fixed'): number {
  return release.notes
    .filter((note) => note.section === section)
    .reduce((total, note) => total + note.bullets.length, 0)
}

function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`
}

function summaryLine(release: Release, earlierCount: number): string | null {
  const parts: string[] = []
  const improved = countBullets(release, 'improved')
  const fixed = countBullets(release, 'fixed')

  if (improved > 0) parts.push(pluralize(improved, 'improvement', 'improvements'))
  if (fixed > 0) parts.push(pluralize(fixed, 'fix', 'fixes'))
  if (earlierCount > 0) parts.push(pluralize(earlierCount, 'earlier release', 'earlier releases'))
  if (parts.length === 0) return null

  return `Also in this update: ${parts.join(', ')}.`
}

export function WhatsNewDialog() {
  const releases = useReleases()
  const { markReleasesRead } = useReleaseMutations()
  const [dismissed, setDismissed] = useState(false)

  const unread = releases.filter((release) => release.unread)
  const latest: Release | undefined = unread[0]
  const open = latest !== undefined && !dismissed

  if (latest === undefined) return null

  const newNotes = latest.notes.filter((note) => note.section === 'new')
  const summary = summaryLine(latest, unread.length - 1)

  function dismiss() {
    setDismissed(true)
    if (latest === undefined) return
    markReleasesRead(latest.id).catch(() => {
      toast.error('Could not mark the updates as read', { position: 'top-center' })
    })
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && dismiss()}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>What&apos;s new</DialogTitle>
          <DialogDescription>{formatDate(latest.published_at)}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
          <ReleaseNoteSections notes={newNotes} />
          {summary !== null && <p className="text-muted-foreground text-sm">{summary}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" asChild onClick={dismiss}>
            <Link to={WHATS_NEW_PATH}>View all</Link>
          </Button>
          <Button autoFocus onClick={dismiss}>
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
