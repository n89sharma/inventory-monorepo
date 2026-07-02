import { describe, expect, it } from 'vitest'
import { generateBarcodePdf, type BarcodeLabel } from './barcodePrintService.js'

const PDF_MAGIC = '%PDF'

const fullLabel: BarcodeLabel = {
  barcode: '1234567890',
  brand: 'Canon',
  model: 'iR-ADV C5560',
  serialNumber: 'ABC12345',
  meterTotal: 125400,
  meterBlack: 100200,
  meterColour: 25200,
}

const nullMeterLabel: BarcodeLabel = {
  barcode: '9876543210',
  brand: 'Ricoh',
  model: 'MP C3004',
  serialNumber: 'XYZ99',
  meterTotal: null,
  meterBlack: null,
  meterColour: null,
}

describe('generateBarcodePdf', () => {
  it('produces a valid PDF buffer', async () => {
    const pdf = await generateBarcodePdf([fullLabel])
    expect(pdf).toBeInstanceOf(Buffer)
    expect(pdf.subarray(0, PDF_MAGIC.length).toString('latin1')).toBe(PDF_MAGIC)
  })

  it('renders labels with null meter counts without throwing', async () => {
    const pdf = await generateBarcodePdf([fullLabel, nullMeterLabel])
    expect(pdf.subarray(0, PDF_MAGIC.length).toString('latin1')).toBe(PDF_MAGIC)
  })

  it('paginates a large batch into a single document', async () => {
    const labels = Array.from({ length: 40 }, (_, i) => ({
      ...fullLabel,
      barcode: `barcode-${i}`,
    }))
    const pdf = await generateBarcodePdf(labels)
    expect(pdf.subarray(0, PDF_MAGIC.length).toString('latin1')).toBe(PDF_MAGIC)
  })
})
