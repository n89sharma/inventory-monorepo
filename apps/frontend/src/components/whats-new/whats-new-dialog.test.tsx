import { WhatsNewDialog } from '@/components/whats-new/whats-new-dialog'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { Release, ReleaseNote } from 'shared-types'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  releases: [] as Release[],
  markReleasesRead: vi.fn(),
}))

vi.mock('@/hooks/use-release', () => ({ useReleases: () => mocks.releases }))
vi.mock('@/hooks/use-release-mutations', () => ({
  useReleaseMutations: () => ({ markReleasesRead: mocks.markReleasesRead }),
}))
vi.mock('@/hooks/use-profile-default-warehouse', () => ({
  useProfileDefaultWarehouse: () => null,
}))
vi.mock('@/hooks/use-default-asset-type', () => ({ useDefaultAssetType: () => null }))

function makeNote(overrides: Partial<ReleaseNote> = {}): ReleaseNote {
  return {
    id: 1,
    section: 'new',
    heading: 'Vendor mismatch warnings',
    link_area: null,
    permission_key: null,
    bullets: ['See a warning when the invoice vendor differs'],
    sort_order: 0,
    ...overrides,
  }
}

function makeRelease(overrides: Partial<Release> = {}): Release {
  return {
    id: 10,
    published_at: new Date('2026-09-17T00:00:00.000Z'),
    unread: true,
    notes: [makeNote()],
    ...overrides,
  }
}

function renderDialog() {
  return render(
    <MemoryRouter>
      <WhatsNewDialog />
    </MemoryRouter>,
  )
}

describe('WhatsNewDialog', () => {
  beforeEach(() => {
    mocks.releases = []
    mocks.markReleasesRead = vi.fn().mockResolvedValue(undefined)
  })

  it('opens with the newest unread release', () => {
    mocks.releases = [makeRelease()]

    renderDialog()

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Vendor mismatch warnings')).toBeInTheDocument()
  })

  it('stays closed when every release is read', () => {
    mocks.releases = [makeRelease({ unread: false })]

    renderDialog()

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('stays closed when a release has no visible note', () => {
    mocks.releases = [makeRelease({ unread: false, notes: [] })]

    renderDialog()

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('marks the newest unread release read on dismiss and does not reopen', () => {
    mocks.releases = [makeRelease({ id: 12 }), makeRelease({ id: 11 })]

    renderDialog()
    fireEvent.click(screen.getByRole('button', { name: 'Got it' }))

    expect(mocks.markReleasesRead).toHaveBeenCalledExactlyOnceWith(12)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('counts the other sections in the summary line', () => {
    mocks.releases = [
      makeRelease({
        notes: [
          makeNote(),
          makeNote({ id: 2, section: 'improved', bullets: ['One', 'Two'] }),
          makeNote({ id: 3, section: 'fixed', bullets: ['Three'] }),
        ],
      }),
    ]

    renderDialog()

    expect(screen.getByText('Also in this update: 2 improvements, 1 fix.')).toBeInTheDocument()
  })
})
