import { TooltipProvider } from '@/components/shadcn/tooltip'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { NuqsTestingAdapter, type UrlUpdateEvent } from 'nuqs/adapters/testing'
import { describe, expect, it, vi } from 'vitest'
import { SavedViewsButton } from './saved-views-button'

const PAGE_KEY = 'search_onhand'
const CURRENT_SEARCH = '?wh=2&type=1'

const mocks = vi.hoisted(() => ({
  view: {
    id: 1,
    name: 'Toronto in-stock',
    page_key: 'search_onhand',
    query_string: 'wh=9&status=4',
    column_ids: ['serial_number', 'status'],
  },
}))

// The Radix menu needs pointer capture that jsdom lacks; render its items as bare
// elements so the test exercises the apply wiring rather than the popover mechanics.
vi.mock('@/components/shadcn/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuItem: ({
    children,
    onSelect,
  }: {
    children: React.ReactNode
    onSelect: () => void
  }) => (
    <div role="menuitem" onClick={onSelect}>
      {children}
    </div>
  ),
}))

// Only the save path reads the live params, and this test never saves.
vi.mock('nuqs/adapters/react-router/v7', () => ({
  useOptimisticSearchParams: () => new URLSearchParams(CURRENT_SEARCH),
}))

vi.mock('@/hooks/use-saved-view', () => ({ useSavedViews: () => ({ data: [mocks.view] }) }))

vi.mock('@/hooks/use-saved-view-mutations', () => ({
  useSavedViewMutations: () => ({ create: vi.fn(), remove: vi.fn() }),
}))

// Guards the write path, not the values: applying a view has to go through nuqs, which owns
// every filter read on the page. Writing the same URL with react-router's setSearchParams
// leaves nuqs holding the previous filters in a production build, so the page ignores the view.
describe('SavedViewsButton', () => {
  it('applies a saved view through nuqs and clears params the view omits', async () => {
    const onUrlUpdate = vi.fn<(event: UrlUpdateEvent) => void>()
    render(<SavedViewsButton pageKey={PAGE_KEY} />, {
      wrapper: ({ children }) => (
        <TooltipProvider>
          <NuqsTestingAdapter searchParams={CURRENT_SEARCH} onUrlUpdate={onUrlUpdate}>
            {children}
          </NuqsTestingAdapter>
        </TooltipProvider>
      ),
    })

    fireEvent.click(screen.getByRole('menuitem', { name: new RegExp(mocks.view.name) }))

    // nuqs batches the write, so the URL update lands after the click's event loop tick.
    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalledOnce())
    const { searchParams } = onUrlUpdate.mock.calls[0]![0]
    expect(searchParams.get('wh')).toBe('9')
    expect(searchParams.get('status')).toBe('4')
    expect(searchParams.get('cols')).toBe(mocks.view.column_ids.join(','))
    expect(searchParams.get('type')).toBeNull()
  })
})
