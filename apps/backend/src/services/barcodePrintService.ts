import { toBuffer } from 'bwip-js'
import PDFDocument from 'pdfkit'

export type BarcodeLabel = {
  barcode: string
  brand: string
  model: string
  serialNumber: string
  meterTotal: number | null
  meterBlack: number | null
  meterColour: number | null
}

const BARCODE_OPTIONS = {
  bcid: 'code128',
  scale: 3,
  height: 12,
  includetext: false,
} as const

const PAGE_MARGIN = 40
const BARCODE_DISPLAY_WIDTH = 240
const ROW_GAP = 24

const BARCODE_FONT_SIZE = 16
const CAPTION_FONT_SIZE = 11

const CAPTION_GAP = 2
const CAPTION_LINE_GAP = 2

const PNG_WIDTH_OFFSET = 16
const PNG_HEIGHT_OFFSET = 20

const EMPTY_METER = '—'

function formatMeter(value: number | null): string {
  return value ? formatThousandsK(value) : EMPTY_METER
}

function formatThousandsK(value: number): string {
  if (value < 1000) return value.toString()
  return (value / 1000).toFixed(0) + ' K'
}

function captionLines(label: BarcodeLabel): [string, string, string] {
  const barcode = `${label.barcode}`
  const brandModelSerial = `${label.brand} / ${label.model} / ${label.serialNumber}`
  const meters = `T: ${formatMeter(label.meterTotal)} B: ${formatMeter(label.meterBlack)} C: ${formatMeter(label.meterColour)}`
  return [barcode, brandModelSerial, meters]
}

export async function generateBarcodePdf(labels: BarcodeLabel[]): Promise<Buffer> {
  const images = await Promise.all(
    labels.map((label) => toBuffer({ ...BARCODE_OPTIONS, text: label.barcode })),
  )

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

    labels.forEach((label, index) => {
      const png = images[index]
      const pixelWidth = png.readUInt32BE(PNG_WIDTH_OFFSET)
      const pixelHeight = png.readUInt32BE(PNG_HEIGHT_OFFSET)
      const displayHeight = BARCODE_DISPLAY_WIDTH * (pixelHeight / pixelWidth)

      const [barcode, brandModelSerial, meters] = captionLines(label)
      const detail = `${brandModelSerial}\n${meters}`

      doc.font('Helvetica').fontSize(BARCODE_FONT_SIZE)
      const barcodeHeight = doc.heightOfString(barcode, {
        width: BARCODE_DISPLAY_WIDTH,
        lineGap: CAPTION_LINE_GAP,
      })
      doc.fontSize(CAPTION_FONT_SIZE)
      const detailHeight = doc.heightOfString(detail, {
        width: BARCODE_DISPLAY_WIDTH,
        lineGap: CAPTION_LINE_GAP,
      })
      const blockHeight = displayHeight + CAPTION_GAP + barcodeHeight + detailHeight

      if (doc.y + blockHeight > doc.page.height - PAGE_MARGIN) {
        doc.addPage()
      }

      const blockTop = doc.y
      doc.image(png, PAGE_MARGIN, blockTop, { width: BARCODE_DISPLAY_WIDTH })

      const captionTop = blockTop + displayHeight + CAPTION_GAP
      doc.fontSize(BARCODE_FONT_SIZE)
      doc.text(barcode, PAGE_MARGIN, captionTop, {
        width: BARCODE_DISPLAY_WIDTH,
        lineGap: CAPTION_LINE_GAP,
        align: 'center',
      })
      doc.fontSize(CAPTION_FONT_SIZE)
      doc.text(detail, PAGE_MARGIN, captionTop + barcodeHeight, {
        width: BARCODE_DISPLAY_WIDTH,
        lineGap: CAPTION_LINE_GAP,
        align: 'center',
      })
      doc.y = blockTop + blockHeight + ROW_GAP
    })

    doc.end()
  })
}
