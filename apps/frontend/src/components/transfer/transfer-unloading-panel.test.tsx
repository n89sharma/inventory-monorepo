import { render } from '@testing-library/react'
import type { TransferAssetRow } from 'shared-types'
import { ASSET_STATUS } from 'shared-types'
import { describe, expect, it, vi } from 'vitest'
import { TransferUnloadingPanel } from './transfer-unloading-panel'

const mocks = vi.hoisted(() => ({
  scanUnloaded: vi.fn(),
  markMissingAtUnload: vi.fn(),
  undoUnload: vi.fn(),
}))

vi.mock('@/hooks/use-transfer-mutations', () => ({
  useTransferMutations: () => mocks,
}))

let lastProps: {
  pendingAssets: TransferAssetRow[]
  resolvedAssets: TransferAssetRow[]
  onScan: (id: number) => Promise<void>
  onMarkMissing: (id: number) => Promise<void>
  onUndo: (id: number) => Promise<void>
} | null = null

vi.mock('@/components/transfer/transfer-scan-split-view', () => ({
  TransferScanSplitView: (props: typeof lastProps) => {
    lastProps = props
    return null
  },
}))

const BASE_ASSET = {
  brand: 'CANON',
  asset_type: 'COPIER',
  readiness: 'UNTESTED',
  location: null,
  is_in_transit: false,
  created_at: new Date('2026-01-01'),
  country_of_origin: null,
  manufactured_year: null,
  weight: 0,
  size: 0,
  specs_meter_total: null,
  specs_cassettes: null,
  specs_internal_finisher: null,
  accessories: [],
  errors: [],
  specs_toner_life_c: null,
  specs_toner_life_m: null,
  specs_toner_life_y: null,
  specs_toner_life_k: null,
  cost_purchase_cost: null,
  cost_transport_cost: null,
  cost_transfer_cost: null,
  cost_processing_cost: null,
  cost_other_cost: null,
  cost_parts_cost: null,
  cost_total_cost: null,
  cost_sale_price: null,
  hold_hold_number: null,
  held_by: null,
  hold_created_for: null,
  hold_customer: null,
  hold_created_at: null,
  vendor: null,
  customer: null,
  salesperson: null,
  departure_number: null,
  departed_at: null,
  arrival_number: null,
  arrival_warehouse_code: null,
  arrival_created_at: null,
  purchase_invoice_invoice_number: null,
  purchase_invoice_invoice_reference: null,
  sales_invoice_invoice_number: null,
  sales_invoice_invoice_reference: null,
  latest_comment: null,
  latest_comment_by: null,
  latest_comment_at: null,
  is_damaged: null,
  damage_notes: null,
}

function makeAsset(overrides: Partial<TransferAssetRow>): TransferAssetRow {
  return {
    ...BASE_ASSET,
    id: 1,
    barcode: 'YYZ-0000001',
    model: 'IR-4025',
    serial_number: 'SN-1',
    status: ASSET_STATUS.IN_STOCK,
    scan: { loaded: false, unloaded: false },
    ...overrides,
  }
}

const MISSING_AT_LOAD = makeAsset({
  id: 1,
  barcode: 'YYZ-0000001',
  status: ASSET_STATUS.MISSING,
  scan: { loaded: false, unloaded: false },
})
const IN_TRANSIT = makeAsset({
  id: 2,
  barcode: 'YYZ-0000002',
  scan: { loaded: true, unloaded: false },
})
const UNLOADED = makeAsset({
  id: 3,
  barcode: 'YYZ-0000003',
  scan: { loaded: true, unloaded: true },
})
const MISSING_AT_UNLOAD = makeAsset({
  id: 4,
  barcode: 'YYZ-0000004',
  status: ASSET_STATUS.MISSING,
  scan: { loaded: true, unloaded: false },
})

describe('TransferUnloadingPanel', () => {
  it('excludes missing-at-load assets and keeps missing-at-unload in pending', () => {
    render(
      <TransferUnloadingPanel
        transferNumber="T-YYZ-0000001"
        assets={[MISSING_AT_LOAD, IN_TRANSIT, UNLOADED, MISSING_AT_UNLOAD]}
        focusKey={0}
      />,
    )

    expect(lastProps?.pendingAssets).toEqual([IN_TRANSIT, MISSING_AT_UNLOAD])
    expect(lastProps?.resolvedAssets).toEqual([UNLOADED])
  })

  it('wires onScan to scanUnloaded and onMarkMissing to markMissingAtUnload', async () => {
    render(
      <TransferUnloadingPanel transferNumber="T-YYZ-0000001" assets={[IN_TRANSIT]} focusKey={0} />,
    )

    await lastProps?.onScan(IN_TRANSIT.id)
    expect(mocks.scanUnloaded).toHaveBeenCalledWith(
      'T-YYZ-0000001',
      IN_TRANSIT.id,
      IN_TRANSIT.barcode,
    )

    await lastProps?.onMarkMissing(IN_TRANSIT.id)
    expect(mocks.markMissingAtUnload).toHaveBeenCalledWith(
      'T-YYZ-0000001',
      IN_TRANSIT.id,
      IN_TRANSIT.barcode,
    )

    await lastProps?.onUndo(IN_TRANSIT.id)
    expect(mocks.undoUnload).toHaveBeenCalledWith(
      'T-YYZ-0000001',
      IN_TRANSIT.id,
      IN_TRANSIT.barcode,
    )
  })
})
