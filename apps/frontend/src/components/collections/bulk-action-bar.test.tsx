import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { BulkActionBar } from './bulk-action-bar'

vi.mock('../shadcn/sidebar', () => ({
  useSidebar: () => ({ state: 'expanded', isMobile: false }),
}))

describe('BulkActionBar', () => {
  it('counts assets when no noun is given', () => {
    render(<BulkActionBar selectedCount={2} totalCount={2} onClear={vi.fn()} />)
    expect(screen.getByText('All 2 assets selected')).toBeInTheDocument()
  })

  it('counts with the noun it is given', () => {
    render(<BulkActionBar selectedCount={1} itemNoun="row" onClear={vi.fn()} />)
    expect(screen.getByText('1 row selected')).toBeInTheDocument()
  })

  it('pluralises the noun it is given when everything is selected', () => {
    render(<BulkActionBar selectedCount={3} totalCount={3} itemNoun="row" onClear={vi.fn()} />)
    expect(screen.getByText('All 3 rows selected')).toBeInTheDocument()
  })
})
