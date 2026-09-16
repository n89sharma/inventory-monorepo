import { TooltipProvider } from '@/components/shadcn/tooltip'
import { makeAssetSearchRow } from '@/test/asset-factories'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { ASSET_SEARCH_COLUMNS, type AssetCellContext } from './asset-search-columns'

const ASSET_HREF = '/assets/BC-1'
const WARNING = "Invoice 63977 is from BOB HORN; this arrival's vendor is ACM."

const barcodeColumn = ASSET_SEARCH_COLUMNS.find((column) => column.id === 'barcode')

function renderBarcodeCell(context: AssetCellContext) {
  render(
    <MemoryRouter>
      <TooltipProvider>{barcodeColumn?.cell?.(makeAssetSearchRow(), context)}</TooltipProvider>
    </MemoryRouter>,
  )
}

describe('barcode cell', () => {
  it('links the barcode with no warning when the page flags nothing', () => {
    renderBarcodeCell({ detailHref: () => ASSET_HREF })

    expect(screen.getByRole('link', { name: 'BC-1' })).toHaveAttribute('href', ASSET_HREF)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('marks a flagged asset with a warning button named by its message', () => {
    renderBarcodeCell({ detailHref: () => ASSET_HREF, assetWarningOf: () => WARNING })

    expect(screen.getByRole('link', { name: 'BC-1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: WARNING })).toBeInTheDocument()
  })
})
