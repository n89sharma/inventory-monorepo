import { toBuffer } from 'bwip-js'
import PDFDocument from 'pdfkit'

const BARCODE_OPTIONS = {
  bcid: 'code128',
  scale: 3,
  height: 12,
  includetext: true,
  textxalign: 'center',
} as const

const PAGE_MARGIN = 40
const BARCODE_DISPLAY_WIDTH = 240
const ROW_GAP = 24

const PNG_WIDTH_OFFSET = 16
const PNG_HEIGHT_OFFSET = 20

export async function generateBarcodePdf(barcodes: string[]): Promise<Buffer> {
  const images = await Promise.all(barcodes.map((text) => toBuffer({ ...BARCODE_OPTIONS, text })))

  return await new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: {
        top: PAGE_MARGIN,
        bottom: PAGE_MARGIN,
        left: PAGE_MARGIN,
        right: PAGE_MARGIN,
      },
    })

    const chunks: Buffer[] = []
    doc.on('data', (chunk) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    for (const png of images) {
      const pixelWidth = png.readUInt32BE(PNG_WIDTH_OFFSET)
      const pixelHeight = png.readUInt32BE(PNG_HEIGHT_OFFSET)
      const displayHeight = BARCODE_DISPLAY_WIDTH * (pixelHeight / pixelWidth)

      if (doc.y + displayHeight > doc.page.height - PAGE_MARGIN) {
        doc.addPage()
      }

      doc.image(png, PAGE_MARGIN, doc.y, { width: BARCODE_DISPLAY_WIDTH })
      doc.y += displayHeight + ROW_GAP
    }

    doc.end()
  })
}
