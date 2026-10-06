import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { INVOICE_TYPE, type AssetSummary, type OrgSummary } from 'shared-types'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CreateInvoiceModal } from './create-invoice-modal'

const PURCHASE = { id: 1, type: INVOICE_TYPE.purchase }
const SALES = { id: 2, type: INVOICE_TYPE.sales }
const CUSTOMER: OrgSummary = { id: 7, account_number: 'C-7', name: 'ACME PRINT' }
const ASSETS = [{ id: 11, barcode: 'YYZ-0000011' }] as AssetSummary[]
const INVOICE_NUMBER = 'I-0000001'
const REFERENCE = 'INV-42'

const mocks = vi.hoisted(() => ({ create: vi.fn() }))

vi.mock('@/hooks/use-invoice-mutations', () => ({
  useInvoiceMutations: () => ({ create: mocks.create }),
}))
vi.mock('@/hooks/use-reference-data', () => ({ useInvoiceTypes: () => [PURCHASE, SALES] }))
vi.mock('@/hooks/use-org', () => ({ useOrgs: () => [CUSTOMER] }))
vi.mock('@/lib/success-toast', () => ({ showEntityCreatedToast: vi.fn() }))

function renderModal(props: Partial<React.ComponentProps<typeof CreateInvoiceModal>> = {}) {
  const onCreated = vi.fn()
  render(
    <MemoryRouter>
      <CreateInvoiceModal open onOpenChange={vi.fn()} onCreated={onCreated} {...props} />
    </MemoryRouter>,
  )
  return { onCreated }
}

describe('CreateInvoiceModal', () => {
  beforeEach(() => {
    mocks.create.mockReset()
    mocks.create.mockResolvedValue({ invoiceNumber: INVOICE_NUMBER })
  })

  it('starts as a purchase invoice with the organization labelled Vendor', () => {
    renderModal()

    expect(screen.getByText('Vendor')).toBeInTheDocument()
    expect(screen.queryByText('Customer')).not.toBeInTheDocument()
  })

  it('takes the type and customer from the prefill, and creates with the attached assets', async () => {
    const { onCreated } = renderModal({
      assets: ASSETS,
      prefill: { invoiceType: INVOICE_TYPE.sales, organization: CUSTOMER },
    })

    expect(screen.getByText('Customer')).toBeInTheDocument()
    fireEvent.change(screen.getByPlaceholderText('e.g. INV-001'), {
      target: { value: REFERENCE },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(INVOICE_NUMBER))
    const [metadata, assets] = mocks.create.mock.calls[0]
    expect(metadata).toMatchObject({
      invoice_reference: REFERENCE,
      organization: CUSTOMER,
      invoice_type: { selected: SALES },
    })
    expect(assets).toBe(ASSETS)
  })
})
