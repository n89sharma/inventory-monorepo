import { render } from '@testing-library/react'
import { ASSET_STATUS, OUTGOING_STATUS, type DepartureAssetRow } from 'shared-types'
import { describe, expect, it, vi } from 'vitest'
import { makeAssetSearchRow } from '@/test/asset-factories'
import { DepartureLoadingPanel } from './departure-loading-panel'

const mocks = vi.hoisted(() => ({
  scanLoaded: vi.fn(),
  markMissingAtLoad: vi.fn(),
  undoLoad: vi.fn(),
}))

vi.mock('@/hooks/use-departure-mutations', () => ({
  useDepartureMutations: () => mocks,
}))

let lastProps: {
  entityName: string
  pendingAssets: DepartureAssetRow[]
  resolvedAssets: DepartureAssetRow[]
  remainingCount: number
  onScan: (id: number) => Promise<void>
  onMarkMissing: (id: number) => Promise<void>
  onUndo: (id: number) => Promise<void>
} | null = null

vi.mock('@/components/shared/scan-split-view', () => ({
  ScanSplitView: (props: typeof lastProps) => {
    lastProps = props
    return null
  },
}))

function makeAsset(overrides: Partial<DepartureAssetRow>): DepartureAssetRow {
  return {
    ...makeAssetSearchRow({ id: 1, barcode: 'YYZ-0000001' }),
    scan: { loaded: false },
    outgoing_status: OUTGOING_STATUS.SOLD,
    ...overrides,
  }
}

const NOT_LOADED = makeAsset({ id: 1, barcode: 'YYZ-0000001' })
const LOADED = makeAsset({ id: 2, barcode: 'YYZ-0000002', scan: { loaded: true } })
const MISSING = makeAsset({ id: 3, barcode: 'YYZ-0000003', status: ASSET_STATUS.MISSING })

describe('DepartureLoadingPanel', () => {
  it('splits assets into pending (not loaded, including missing) and resolved (loaded)', () => {
    render(
      <DepartureLoadingPanel
        departureNumber="D-YYZ-0000001"
        assets={[NOT_LOADED, LOADED, MISSING]}
        focusKey={0}
      />,
    )

    expect(lastProps?.entityName).toBe('departure')
    expect(lastProps?.pendingAssets).toEqual([NOT_LOADED, MISSING])
    expect(lastProps?.resolvedAssets).toEqual([LOADED])
  })

  it('leaves missing assets out of the remaining count', () => {
    render(
      <DepartureLoadingPanel
        departureNumber="D-YYZ-0000001"
        assets={[NOT_LOADED, LOADED, MISSING]}
        focusKey={0}
      />,
    )

    expect(lastProps?.remainingCount).toBe(1)
  })

  it('wires the actions to the departure mutations', async () => {
    render(
      <DepartureLoadingPanel departureNumber="D-YYZ-0000001" assets={[NOT_LOADED]} focusKey={0} />,
    )

    await lastProps?.onScan(NOT_LOADED.id)
    expect(mocks.scanLoaded).toHaveBeenCalledWith(
      'D-YYZ-0000001',
      NOT_LOADED.id,
      NOT_LOADED.barcode,
    )

    await lastProps?.onMarkMissing(NOT_LOADED.id)
    expect(mocks.markMissingAtLoad).toHaveBeenCalledWith(
      'D-YYZ-0000001',
      NOT_LOADED.id,
      NOT_LOADED.barcode,
    )

    await lastProps?.onUndo(NOT_LOADED.id)
    expect(mocks.undoLoad).toHaveBeenCalledWith('D-YYZ-0000001', NOT_LOADED.id, NOT_LOADED.barcode)
  })
})
