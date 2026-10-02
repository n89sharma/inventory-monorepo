import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { BidFormPage } from './bid-form-page'

vi.mock('@/hooks/use-org', () => ({ useOrgs: () => [] }))

const PAGE_CONFIG = {
  pageHeading: 'Create Bid',
  saveButtonText: 'Create Bid',
  submittingText: 'Creating…',
  cancelNavUrl: '/bids',
}

function renderPage() {
  render(
    <MemoryRouter>
      <BidFormPage pageConfig={PAGE_CONFIG} breadcrumbs={[]} onValidSubmit={vi.fn()} />
    </MemoryRouter>,
  )
}

function paste(text: string) {
  fireEvent.change(screen.getByLabelText('Pasted rows'), { target: { value: text } })
}

describe('BidFormPage vendor sheet', () => {
  it('counts the pasted rows and columns', () => {
    renderPage()
    paste('Serial\tModel\nS1\tC3000\nS2\tC4500')
    expect(screen.getByText('2 rows, 2 columns')).toBeInTheDocument()
  })

  it('shows the parse error inline', () => {
    renderPage()
    paste('Serial\tModel')
    expect(screen.getByRole('alert')).toHaveTextContent('Paste at least one row of data')
  })

  it('shows nothing until something is pasted', () => {
    renderPage()
    expect(screen.queryByText(/rows?, \d+ columns?/)).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
