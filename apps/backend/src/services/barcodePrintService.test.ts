import { describe, expect, it } from 'vitest'
import {
  ASSET_LABEL_LAYOUT,
  LOCATION_LABEL_LAYOUT,
  generateBarcodePdf,
  type BarcodeContent,
} from './barcodePrintService.js'

const PDF_MAGIC = '%PDF'

const assetContent: BarcodeContent = {
  barcode: '1234567890',
  primary: '1234567890',
  secondary: ['Canon iR-ADV C5560', 'ABC12345', 'T: 125 K B: 100 K C: 25 K'],
}

const locationContent: BarcodeContent = {
  barcode: 'A-12',
  primary: 'A-12',
  secondary: [],
}

describe('generateBarcodePdf', () => {
  it('produces a valid PDF buffer for an asset label', async () => {
    const pdf = await generateBarcodePdf([assetContent], ASSET_LABEL_LAYOUT)
    expect(pdf).toBeInstanceOf(Buffer)
    expect(pdf.subarray(0, PDF_MAGIC.length).toString('latin1')).toBe(PDF_MAGIC)
  })

  it('renders a location label with no secondary lines without throwing', async () => {
    const pdf = await generateBarcodePdf([locationContent], LOCATION_LABEL_LAYOUT)
    expect(pdf.subarray(0, PDF_MAGIC.length).toString('latin1')).toBe(PDF_MAGIC)
  })

  it('paginates a large batch into a single document', async () => {
    const contents = Array.from({ length: 40 }, (_, i) => ({
      ...assetContent,
      barcode: `barcode-${i}`,
      primary: `barcode-${i}`,
    }))
    const pdf = await generateBarcodePdf(contents, ASSET_LABEL_LAYOUT)
    expect(pdf.subarray(0, PDF_MAGIC.length).toString('latin1')).toBe(PDF_MAGIC)
  })
})
