import { useColumnVisibilityParam } from '@/hooks/use-column-visibility-param'
import { act, renderHook, waitFor } from '@testing-library/react'
import { NuqsTestingAdapter, type UrlUpdateEvent } from 'nuqs/adapters/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AppRole } from 'shared-types'

const DEFAULT_IDS = ['serial_number', 'status']
const PURCHASE_COST_ID = 'cost_purchase_cost'

const mocks = vi.hoisted(() => ({ role: 'admin' as AppRole }))

vi.mock('@/hooks/use-role', () => ({ useRole: () => mocks.role }))

function renderWithParams(
  searchParams: string,
  onUrlUpdate?: (event: UrlUpdateEvent) => void,
  forcedIds?: readonly string[],
) {
  return renderHook(() => useColumnVisibilityParam(DEFAULT_IDS, forcedIds), {
    wrapper: ({ children }) => (
      <NuqsTestingAdapter searchParams={searchParams} onUrlUpdate={onUrlUpdate}>
        {children}
      </NuqsTestingAdapter>
    ),
  })
}

beforeEach(() => {
  mocks.role = 'admin'
})

describe('useColumnVisibilityParam', () => {
  it('falls back to the defaults when the param is absent', () => {
    const { result } = renderWithParams('')
    expect([...result.current.visibleColumns].sort()).toEqual([...DEFAULT_IDS].sort())
  })

  // An empty param is a deliberate choice to hide everything hideable, so it must not be
  // read as "never chose" and quietly restored to the defaults.
  it('hides every hideable column when the param is present but empty', () => {
    const { result } = renderWithParams('?cols=')
    expect(result.current.visibleColumns.size).toBe(0)
    expect(Object.values(result.current.columnVisibility).every((visible) => !visible)).toBe(true)
    expect(result.current.columnVisibility).not.toHaveProperty('barcode')
  })

  it('writes an empty param rather than clearing it when the last column is unchecked', async () => {
    const onUrlUpdate = vi.fn<(event: UrlUpdateEvent) => void>()
    const { result } = renderWithParams('?cols=serial_number', onUrlUpdate)

    act(() => result.current.setVisibleColumns(new Set()))

    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalledOnce())
    expect(onUrlUpdate.mock.calls[0]![0].searchParams.get('cols')).toBe('')
  })

  it('clears the param when the selection matches the defaults', async () => {
    const onUrlUpdate = vi.fn<(event: UrlUpdateEvent) => void>()
    const { result } = renderWithParams('?cols=serial_number', onUrlUpdate)

    act(() => result.current.setVisibleColumns(new Set(DEFAULT_IDS)))

    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalledOnce())
    expect(onUrlUpdate.mock.calls[0]![0].searchParams.get('cols')).toBeNull()
  })

  it('shows a forced column the viewer may see', () => {
    const { result } = renderWithParams('?cols=', undefined, [PURCHASE_COST_ID])
    expect(result.current.visibleColumns.has(PURCHASE_COST_ID)).toBe(true)
  })

  it('keeps a forced column hidden when the viewer lacks its permission', () => {
    mocks.role = 'member'
    const { result } = renderWithParams('?cols=', undefined, [PURCHASE_COST_ID])
    expect(result.current.visibleColumns.has(PURCHASE_COST_ID)).toBe(false)
    expect(result.current.columnVisibility[PURCHASE_COST_ID]).toBe(false)
  })

  it('writes the param when the table hides a column through the change handler', async () => {
    const onUrlUpdate = vi.fn<(event: UrlUpdateEvent) => void>()
    const { result } = renderWithParams('?cols=serial_number,status', onUrlUpdate)

    act(() => result.current.onColumnVisibilityChange((prev) => ({ ...prev, status: false })))

    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalledOnce())
    expect(onUrlUpdate.mock.calls[0]![0].searchParams.get('cols')).toBe('serial_number')
  })

  // toggleAllColumnsVisible writes every leaf column, always-visible and select included.
  it('keeps ids it does not track out of the param the change handler writes', async () => {
    const onUrlUpdate = vi.fn<(event: UrlUpdateEvent) => void>()
    const { result } = renderWithParams('?cols=status', onUrlUpdate)

    act(() =>
      result.current.onColumnVisibilityChange((prev) => ({
        ...prev,
        barcode: true,
        select: true,
        brand: true,
      })),
    )

    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalledOnce())
    expect(onUrlUpdate.mock.calls[0]![0].searchParams.get('cols')).toBe('brand,status')
  })

  it('keeps a forced column out of the param it writes', async () => {
    const onUrlUpdate = vi.fn<(event: UrlUpdateEvent) => void>()
    const { result } = renderWithParams('?cols=serial_number', onUrlUpdate, [PURCHASE_COST_ID])

    act(() => result.current.setVisibleColumns(result.current.visibleColumns))

    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalledOnce())
    expect(onUrlUpdate.mock.calls[0]![0].searchParams.get('cols')).toBe('serial_number')
  })
})
