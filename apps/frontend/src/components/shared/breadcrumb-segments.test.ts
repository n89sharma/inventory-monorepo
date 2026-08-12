import { describe, expect, it } from 'vitest'
import { getBreadcrumForAssetDetails, getBreadcrumbForAssetSummary } from './breadcrumb-segments'

const COLS_SEARCH = '?cols=status%2Clocation'

describe('getBreadcrumForAssetDetails', () => {
  it('carries the column choice back to the collection it came from', () => {
    const segments = getBreadcrumForAssetDetails('holds', 'H-1', null, COLS_SEARCH)

    expect(segments[1].href).toBe(`/holds/H-1${COLS_SEARCH}`)
  })

  it('leaves the collection list link clean, because it has its own columns', () => {
    const segments = getBreadcrumForAssetDetails('holds', 'H-1', null, COLS_SEARCH)

    expect(segments[0].href).toBe('/holds')
  })

  it('links straight to the collection when there is nothing to carry', () => {
    const segments = getBreadcrumForAssetDetails('invoices', 'INV-1', null, '')

    expect(segments[1].href).toBe('/invoices/INV-1')
  })

  it('carries the search list state too', () => {
    const segments = getBreadcrumForAssetDetails('search', null, 'departed', COLS_SEARCH)

    expect(segments[0].href).toBe(`/search/departed${COLS_SEARCH}`)
  })

  it('offers no way back when the asset was not opened from a list', () => {
    const segments = getBreadcrumForAssetDetails('assets', null, null, COLS_SEARCH)

    expect(segments).toEqual([])
  })
})

describe('getBreadcrumbForAssetSummary', () => {
  it('carries the list state back to the section', () => {
    const segments = getBreadcrumbForAssetSummary('holds', COLS_SEARCH)

    expect(segments[0].href).toBe(`/holds${COLS_SEARCH}`)
  })
})
