import { AssetHistoryList } from '@/components/asset-details/asset-history'
import { render } from '@testing-library/react'
import type { AssetHistoryRecord } from 'shared-types'
import { describe, expect, it } from 'vitest'

const RECORD_BASE = { user_name: 'Test User', changed_on: new Date('2026-07-17T00:09:07Z') }

function renderHistoryText(record: AssetHistoryRecord): string {
  const { container } = render(<AssetHistoryList history={[record]} />)
  return container.textContent ?? ''
}

describe('AssetHistoryList', () => {
  it('renders a status-only update row as a status change', () => {
    const text = renderHistoryText({
      ...RECORD_BASE,
      action_type: 'UPDATE',
      changes: { before: { status: 'HELD' }, after: { status: 'IN_STOCK' } },
    })

    expect(text).toContain('Status Held → In Stock')
  })

  it('renders the barcode, serial, model and arrival on a create row', () => {
    const text = renderHistoryText({
      ...RECORD_BASE,
      action_type: 'CREATE',
      changes: {
        after: {
          barcode: 'YYZ-0000001',
          serial_number: 'SN-1',
          brand_name: 'Canon',
          model_name: 'IRADX4751i',
          arrival_number: 'A-YYZ-0000001',
        },
      },
    })

    expect(text).toContain('Barcode YYZ-0000001')
    expect(text).toContain('Serial Number SN-1')
    expect(text).toContain('Model Canon IRADX4751i')
    expect(text).toContain('Arrival A-YYZ-0000001')
  })

  it('renders each non-empty group of an errors row', () => {
    const text = renderHistoryText({
      ...RECORD_BASE,
      action_type: 'ERRORS_CHANGED',
      changes: { added: ['E100', 'E200'], fixed: ['E300'], reopened: ['E400'], removed: ['E500'] },
    })

    expect(text).toContain('Errors Added E100, E200')
    expect(text).toContain('Errors Fixed E300')
    expect(text).toContain('Errors Reopened E400')
    expect(text).toContain('Errors Removed E500')
  })

  it('renders the part number and quantity of a store part added', () => {
    const text = renderHistoryText({
      ...RECORD_BASE,
      action_type: 'PART_ADDED',
      changes: { source: 'store', part_number: 'FM1-1234', quantity: 2 },
    })

    expect(text).toContain('Part Number FM1-1234')
    expect(text).toContain('Quantity 2')
  })

  it('renders the part and donor of a harvested part added', () => {
    const text = renderHistoryText({
      ...RECORD_BASE,
      action_type: 'PART_ADDED',
      changes: {
        source: 'harvested',
        part: 'Fuser',
        donor_barcode: 'YYZ-0000002',
        is_exchange: true,
      },
    })

    expect(text).toContain('Part Fuser')
    expect(text).toContain('From YYZ-0000002')
    expect(text).toContain('Exchange Yes')
  })

  it('renders the part and recipient of a part harvested', () => {
    const text = renderHistoryText({
      ...RECORD_BASE,
      action_type: 'PART_HARVESTED',
      changes: { part: 'Fuser', recipient_barcode: 'YYZ-0000001', is_exchange: false },
    })

    expect(text).toContain('harvested a part')
    expect(text).toContain('For YYZ-0000001')
    expect(text).toContain('Exchange No')
  })

  it('renders the transfer, route and the location left on a dispatch', () => {
    const text = renderHistoryText({
      ...RECORD_BASE,
      action_type: 'TRANSFER_DISPATCHED',
      changes: {
        transfer_number: 'T-YYZ-0000001',
        origin_city_code: 'YYZ',
        destination_city_code: 'YUL',
        before: { warehouse: 'YYZ', zone: 'A', bin: '01' },
        after: { warehouse: null, zone: null, bin: null },
      },
    })

    expect(text).toContain('dispatched')
    expect(text).toContain('Transfer T-YYZ-0000001')
    expect(text).toContain('Route YYZ → YUL')
    expect(text).toContain('From YYZ / A / 01')
    expect(text).toContain('To In transit')
  })

  it('still renders a legacy errors field-edit row as before → after', () => {
    const text = renderHistoryText({
      ...RECORD_BASE,
      action_type: 'UPDATE',
      changes: { before: { error_codes: ['E100'] }, after: { error_codes: ['E100', 'E200'] } },
    })

    expect(text).toContain('Errors E100 → E100, E200')
  })
})
