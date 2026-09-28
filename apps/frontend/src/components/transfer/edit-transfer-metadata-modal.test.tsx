import { fireEvent, render, screen } from '@testing-library/react'
import type { OrgDetail, TransferDetail, Warehouse } from 'shared-types'
import { TRANSFER_STATUS } from 'shared-types'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { EditTransferMetadataModal } from './edit-transfer-metadata-modal'

const ORIGIN: Warehouse = { id: 1, city_code: 'YYZ', street: '1 Main St', is_active: true }
const DESTINATION: Warehouse = { id: 2, city_code: 'YUL', street: '2 Main St', is_active: true }
const TRANSPORTER: OrgDetail = {
  id: 3,
  account_number: 'T-3',
  name: 'FAST FREIGHT',
  contact_name: null,
  phone: null,
  mobile: null,
  primary_email: null,
  address: null,
  city: null,
  province: null,
  country: null,
}

vi.mock('@/hooks/use-active-warehouses', () => ({
  useActiveWarehouses: () => [ORIGIN, DESTINATION],
}))

vi.mock('@/hooks/use-org', () => ({
  useOrgs: () => [TRANSPORTER],
}))

function makeTransfer(status: string, transferDate: string | null): TransferDetail {
  return {
    transfer_number: 'T-YYZ-0000001',
    status,
    origin: ORIGIN,
    destination: DESTINATION,
    transporter: TRANSPORTER,
    notes: 'Original note',
    created_at: new Date('2026-01-01'),
    created_by: 'Test User',
    transfer_date: transferDate,
    assets: [],
  }
}

function renderModal(transfer: TransferDetail) {
  const onSaveMetadata = vi.fn().mockResolvedValue(undefined)
  const onSaveNotes = vi.fn().mockResolvedValue(undefined)
  const onSaveDate = vi.fn().mockResolvedValue(undefined)
  render(
    <EditTransferMetadataModal
      open={true}
      onOpenChange={() => {}}
      transfer={transfer}
      onSaveMetadata={onSaveMetadata}
      onSaveNotes={onSaveNotes}
      onSaveDate={onSaveDate}
    />,
  )
  return { onSaveMetadata, onSaveNotes, onSaveDate }
}

describe('EditTransferMetadataModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('DRAFT: date field is locked (not yet scheduled)', () => {
    renderModal(makeTransfer(TRANSFER_STATUS.DRAFT, null))

    expect(screen.getByRole('button', { name: 'Transfer Date' })).toBeDisabled()
  })

  it('SCHEDULED: date field is editable', () => {
    renderModal(makeTransfer(TRANSFER_STATUS.SCHEDULED, '2026-02-01'))

    expect(screen.getByRole('button', { name: /Transfer Date/ })).toBeEnabled()
  })

  it('IN_TRANSIT: date field is locked again', () => {
    renderModal(makeTransfer(TRANSFER_STATUS.IN_TRANSIT, '2026-02-01'))

    expect(screen.getByRole('button', { name: /Transfer Date/ })).toBeDisabled()
  })

  it('IN_TRANSIT: saving a changed comment calls onSaveNotes only', async () => {
    const { onSaveMetadata, onSaveNotes } = renderModal(
      makeTransfer(TRANSFER_STATUS.IN_TRANSIT, '2026-02-01'),
    )

    fireEvent.change(screen.getByPlaceholderText('Transfer notes…'), {
      target: { value: 'Updated note' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))

    await vi.waitFor(() => expect(onSaveNotes).toHaveBeenCalledWith('Updated note'))
    expect(onSaveMetadata).not.toHaveBeenCalled()
  })
})
