import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { AssetIdentity, OrgDetail } from 'shared-types'
import { SWRConfig } from 'swr'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SplitArrivalModal } from './split-arrival-modal'

const mutations = vi.hoisted(() => ({ splitAssets: vi.fn() }))

vi.mock('@/hooks/use-arrival-mutations', () => ({
  useArrivalMutations: () => mutations,
}))

const orgs = vi.hoisted(() => ({ list: [] as OrgDetail[] }))

vi.mock('@/hooks/use-org', () => ({
  useOrgs: () => orgs.list,
}))

const VENDOR_B: OrgDetail = {
  id: 7,
  account_number: 'V-7',
  name: 'NORTHERN COPIERS',
  contact_name: null,
  phone: null,
  mobile: null,
  primary_email: null,
  address: null,
  city: null,
  province: null,
  country: null,
}
const TRANSPORTER: OrgDetail = { ...VENDOR_B, id: 3, account_number: 'T-3', name: 'FAST FREIGHT' }
const ASSET_LABELS = {
  brand: 'CANON',
  model: 'IR-4025',
  asset_type: 'COPIER',
  serial_number: 'SN-1',
}
const SELECTED_ASSETS: AssetIdentity[] = [
  { ...ASSET_LABELS, id: 21, barcode: 'YYZ-0000021' },
  { ...ASSET_LABELS, id: 22, barcode: 'YYZ-0000022', serial_number: 'SN-2' },
]
const SOURCE_ARRIVAL_NUMBER = 'A-YYZ-0000100'
const WAREHOUSE_CODE = 'YYZ'
const NEW_ARRIVAL_NUMBER = 'A-YYZ-0000101'

// A fresh cache per render and no dedupe window, so each test drives its own reads.
const SWR_TEST_OPTIONS = {
  provider: () => new Map(),
  dedupingInterval: 0,
  shouldRetryOnError: false,
  revalidateOnFocus: false,
}

function renderModal() {
  const onOpenChange = vi.fn()
  const onConfirmSuccess = vi.fn()
  const modal = (open: boolean) => (
    <MemoryRouter>
      <SWRConfig value={SWR_TEST_OPTIONS}>
        <SplitArrivalModal
          open={open}
          onOpenChange={onOpenChange}
          sourceArrivalNumber={SOURCE_ARRIVAL_NUMBER}
          sourceWarehouseCode={WAREHOUSE_CODE}
          sourceTransporter={TRANSPORTER}
          selectedAssets={SELECTED_ASSETS}
          onConfirmSuccess={onConfirmSuccess}
        />
      </SWRConfig>
    </MemoryRouter>
  )
  const { rerender } = render(modal(true))
  return {
    onOpenChange,
    onConfirmSuccess,
    // The modal stays mounted while the page toggles `open`, which is what makes a form that
    // never clears itself visible on the next open.
    reopen: () => {
      rerender(modal(false))
      rerender(modal(true))
    },
  }
}

function pickVendor(name: string) {
  const row = screen.getByText('Vendor').parentElement
  const input = row?.querySelector('input[role="combobox"]')
  if (!(input instanceof HTMLInputElement)) throw new Error('No vendor combobox')
  fireEvent.change(input, { target: { value: name.split(' ')[0] } })
  fireEvent.click(screen.getByRole('option', { name }))
}

function splitArrival() {
  fireEvent.click(screen.getByRole('button', { name: 'Split arrival' }))
}

describe('SplitArrivalModal', () => {
  beforeEach(() => {
    orgs.list = [VENDOR_B, TRANSPORTER]
    mutations.splitAssets.mockReset()
    mutations.splitAssets.mockResolvedValue(NEW_ARRIVAL_NUMBER)
  })

  it('prefills the transporter and names the inherited warehouse', () => {
    renderModal()

    expect(screen.getByText(TRANSPORTER.name)).toBeInTheDocument()
    expect(
      screen.getByText(`Warehouse ${WAREHOUSE_CODE}, the same as Arrival ${SOURCE_ARRIVAL_NUMBER}`),
    ).toBeInTheDocument()
  })

  it('does not split until a vendor is chosen', async () => {
    renderModal()
    splitArrival()

    await waitFor(() => expect(mutations.splitAssets).not.toHaveBeenCalled())
  })

  it('splits the selected assets onto a new arrival with the chosen vendor', async () => {
    const { onConfirmSuccess } = renderModal()
    pickVendor(VENDOR_B.name)
    splitArrival()

    await waitFor(() => expect(mutations.splitAssets).toHaveBeenCalledOnce())
    expect(mutations.splitAssets).toHaveBeenCalledWith(
      SOURCE_ARRIVAL_NUMBER,
      {
        vendor: expect.objectContaining({ id: VENDOR_B.id }),
        transporter: expect.objectContaining({ id: TRANSPORTER.id }),
        comment: null,
      },
      SELECTED_ASSETS,
    )
    expect(onConfirmSuccess).toHaveBeenCalledOnce()
  })

  it('drops a half-filled arrival when the modal is cancelled and reopened', () => {
    const { reopen } = renderModal()
    pickVendor(VENDOR_B.name)

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    reopen()

    expect(screen.queryByText(VENDOR_B.name)).not.toBeInTheDocument()
    expect(screen.getByText(TRANSPORTER.name)).toBeInTheDocument()
  })
})
