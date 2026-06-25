import { render, screen } from '@testing-library/react'
import { ASSET_STATUS } from 'shared-types'
import { describe, expect, it } from 'vitest'
import { StatusBadge } from './status-badge'

describe('StatusBadge', () => {
  it('renders the status label in title case', () => {
    render(<StatusBadge status={ASSET_STATUS.IN_STOCK} />)
    expect(screen.getByText('In Stock')).toBeInTheDocument()
  })

  it('applies the in-stock color class', () => {
    render(<StatusBadge status={ASSET_STATUS.IN_STOCK} />)
    expect(screen.getByText('In Stock')).toHaveClass('bg-lime-300')
  })
})
