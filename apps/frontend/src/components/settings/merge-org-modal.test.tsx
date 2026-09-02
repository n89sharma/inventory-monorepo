import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { OrgDetail, OrgMergePreview } from 'shared-types'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { MergeOrgModal } from './merge-org-modal'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const preview = vi.hoisted(() => ({ current: undefined as OrgMergePreview | undefined }))
vi.mock('@/hooks/use-org', () => ({
  useOrgMergePreview: () => preview.current,
}))

const mergeOrgs = vi.hoisted(() => vi.fn())
vi.mock('@/hooks/use-org-mutations', () => ({
  useOrgMutations: () => ({ mergeOrgs }),
}))

function org(id: number, name: string): OrgDetail {
  return {
    id,
    account_number: `ACC-${id}`,
    name,
    contact_name: null,
    phone: null,
    mobile: null,
    primary_email: null,
    address: null,
    city: null,
    province: null,
    country: null,
  }
}

const KDI = org(1802, 'KDI')
const KDI_OFFICE = org(2311, 'KDI Office Technology')

const PREVIEW: OrgMergePreview = {
  winner_id: KDI.id,
  candidates: [
    { id: KDI.id, name: KDI.name, account_number: KDI.account_number, reference_count: 140 },
    {
      id: KDI_OFFICE.id,
      name: KDI_OFFICE.name,
      account_number: KDI_OFFICE.account_number,
      reference_count: 12,
    },
  ],
}

// Radix sizes the dialog with a ResizeObserver, which jsdom does not implement.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function renderModal() {
  const onMerged = vi.fn()
  render(
    <MergeOrgModal
      open={true}
      onOpenChange={vi.fn()}
      orgs={[KDI_OFFICE, KDI]}
      onMerged={onMerged}
    />,
  )
  return { onMerged }
}

describe('MergeOrgModal', () => {
  beforeAll(() => {
    vi.stubGlobal('ResizeObserver', ResizeObserverStub)
  })

  it('waits for the reference counts before offering to merge', () => {
    preview.current = undefined
    renderModal()

    expect(screen.getByText(/checking references/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Merge Organizations' })).not.toBeInTheDocument()
  })

  it('names the surviving row and how much moves onto it', () => {
    preview.current = PREVIEW
    renderModal()

    expect(screen.getByText(/12 references will move onto it/)).toBeInTheDocument()
    expect(screen.getByText(/Kept — KDI \(140\)/)).toBeInTheDocument()
    expect(screen.getByText(/Deleted — KDI Office Technology \(12\)/)).toBeInTheDocument()
  })

  it('prefills from the winner, not from the first selected row', () => {
    preview.current = PREVIEW
    renderModal()

    expect(screen.getByDisplayValue('KDI')).toBeInTheDocument()
    expect(screen.getByDisplayValue('ACC-1802')).toBeInTheDocument()
  })

  it('submits every selected id so nothing is left behind', async () => {
    preview.current = PREVIEW
    mergeOrgs.mockResolvedValueOnce({ id: KDI.id })
    const { onMerged } = renderModal()

    fireEvent.click(screen.getByRole('button', { name: 'Merge Organizations' }))

    await waitFor(() => expect(mergeOrgs).toHaveBeenCalled())
    expect(mergeOrgs).toHaveBeenCalledWith(
      [KDI.id, KDI_OFFICE.id],
      expect.objectContaining({ name: 'KDI' }),
    )
    expect(onMerged).toHaveBeenCalled()
  })
})
