import { fireEvent, render, screen } from '@testing-library/react'
import {
  DEPARTURE_STATUS,
  type DepartureDetail,
  type OrgDetail,
  type User,
  type Warehouse,
} from 'shared-types'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { EditDepartureMetadataModal } from './edit-departure-metadata-modal'

const ORIGIN: Warehouse = { id: 1, city_code: 'YYZ', street: '1 Main St', is_active: true }
const CUSTOMER: OrgDetail = {
  id: 3,
  account_number: 'C-3',
  name: 'ABM',
  contact_name: null,
  phone: null,
  mobile: null,
  primary_email: null,
  address: null,
  city: null,
  province: null,
  country: null,
}
const SALESPERSON: User = {
  id: 7,
  name: 'Jane Smith',
  email: null,
  is_active: true,
  role: null,
  clerk_id: null,
  default_warehouse_id: null,
}

vi.mock('@/hooks/use-active-warehouses', () => ({
  useActiveWarehouses: () => [ORIGIN],
}))

vi.mock('@/hooks/use-active-users', () => ({
  useActiveUsers: () => [SALESPERSON],
}))

vi.mock('@/hooks/use-org', () => ({
  useOrgs: () => [CUSTOMER],
}))

function makeDeparture(status: string, departureDate: string | null): DepartureDetail {
  return {
    departure_number: 'D-YYZ-0000001',
    status,
    origin: ORIGIN,
    customer: CUSTOMER,
    transporter: CUSTOMER,
    notes: 'Original note',
    created_at: new Date('2026-01-01'),
    created_by: 'Test User',
    departure_date: departureDate,
    salesperson: SALESPERSON,
    assets: [],
    invoices: [],
  }
}

function renderModal(departure: DepartureDetail) {
  const onSave = vi.fn().mockResolvedValue(undefined)
  const onSaveNotes = vi.fn().mockResolvedValue(undefined)
  const onSaveDate = vi.fn().mockResolvedValue(undefined)
  render(
    <EditDepartureMetadataModal
      open={true}
      onOpenChange={() => {}}
      departure={departure}
      onSave={onSave}
      onSaveNotes={onSaveNotes}
      onSaveDate={onSaveDate}
    />,
  )
  return { onSave, onSaveNotes, onSaveDate }
}

describe('EditDepartureMetadataModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('DRAFT: date field is locked (not yet scheduled)', () => {
    renderModal(makeDeparture(DEPARTURE_STATUS.DRAFT, null))

    expect(screen.getByRole('button', { name: /Departure Date/ })).toBeDisabled()
  })

  it('SCHEDULED: date field is editable', () => {
    renderModal(makeDeparture(DEPARTURE_STATUS.SCHEDULED, '2026-02-01'))

    expect(screen.getByRole('button', { name: /Departure Date/ })).toBeEnabled()
  })

  it('LOADING_IN_PROGRESS: date field is locked again', () => {
    renderModal(makeDeparture(DEPARTURE_STATUS.LOADING_IN_PROGRESS, '2026-02-01'))

    expect(screen.getByRole('button', { name: /Departure Date/ })).toBeDisabled()
  })

  it('DRAFT: saving a changed comment saves the metadata, not just the notes', async () => {
    const { onSave, onSaveNotes, onSaveDate } = renderModal(
      makeDeparture(DEPARTURE_STATUS.DRAFT, null),
    )

    fireEvent.change(screen.getByPlaceholderText('Departure notes…'), {
      target: { value: 'Updated note' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))

    await vi.waitFor(() => expect(onSave).toHaveBeenCalled())
    expect(onSaveNotes).not.toHaveBeenCalled()
    expect(onSaveDate).not.toHaveBeenCalled()
  })

  it('SCHEDULED: saving a changed comment calls onSaveNotes only', async () => {
    const { onSave, onSaveNotes, onSaveDate } = renderModal(
      makeDeparture(DEPARTURE_STATUS.SCHEDULED, '2026-02-01'),
    )

    fireEvent.change(screen.getByPlaceholderText('Departure notes…'), {
      target: { value: 'Updated note' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))

    await vi.waitFor(() => expect(onSaveNotes).toHaveBeenCalledWith('Updated note'))
    expect(onSave).not.toHaveBeenCalled()
    expect(onSaveDate).not.toHaveBeenCalled()
  })
})
