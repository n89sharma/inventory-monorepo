import { fireEvent, render, screen } from '@testing-library/react'
import type { DepartureDetail, OrgDetail, User, Warehouse } from 'shared-types'
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

function makeDeparture(departureDate: string | null): DepartureDetail {
  return {
    departure_number: 'D-YYZ-0000001',
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
  const onSaveDate = vi.fn().mockResolvedValue(undefined)
  render(
    <EditDepartureMetadataModal
      open={true}
      onOpenChange={() => {}}
      departure={departure}
      onSave={onSave}
      onSaveDate={onSaveDate}
    />,
  )
  return { onSave, onSaveDate }
}

describe('EditDepartureMetadataModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows the departure date field', () => {
    renderModal(makeDeparture('2026-02-01'))

    expect(screen.getByRole('button', { name: /Departure Date/ })).toBeEnabled()
  })

  it('saving an unchanged date does not call onSaveDate', async () => {
    const { onSave, onSaveDate } = renderModal(makeDeparture('2026-02-01'))

    fireEvent.change(screen.getByPlaceholderText('Departure notes…'), {
      target: { value: 'Updated note' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))

    await vi.waitFor(() => expect(onSave).toHaveBeenCalled())
    expect(onSaveDate).not.toHaveBeenCalled()
  })
})
