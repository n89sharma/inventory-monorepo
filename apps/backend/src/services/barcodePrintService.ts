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

const LABEL_WIDTH = 288 // 4in at 72pt
const LABEL_HEIGHT = 144 // 2in at 72pt
const LABEL_PADDING = 8

const BARCODE_DISPLAY_WIDTH = 240

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
      size: [LABEL_WIDTH, LABEL_HEIGHT],
      margin: LABEL_PADDING,
    })

    const chunks: Buffer[] = []
    doc.on('data', (chunk) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const captionWidth = LABEL_WIDTH - LABEL_PADDING * 2
    const barcodeLeft = (LABEL_WIDTH - BARCODE_DISPLAY_WIDTH) / 2

    labels.forEach((label, index) => {
      if (index > 0) doc.addPage()

      const png = images[index]
      const pixelWidth = png.readUInt32BE(PNG_WIDTH_OFFSET)
      const pixelHeight = png.readUInt32BE(PNG_HEIGHT_OFFSET)
      const displayHeight = BARCODE_DISPLAY_WIDTH * (pixelHeight / pixelWidth)

      const [barcode, brandModelSerial, meters] = captionLines(label)
      const detail = `${brandModelSerial}\n${meters}`

      doc.font('Helvetica').fontSize(BARCODE_FONT_SIZE)
      const barcodeHeight = doc.heightOfString(barcode, {
        width: captionWidth,
        lineGap: CAPTION_LINE_GAP,
      })
      doc.fontSize(CAPTION_FONT_SIZE)
      const detailHeight = doc.heightOfString(detail, {
        width: captionWidth,
        lineGap: CAPTION_LINE_GAP,
      })
      const blockHeight = displayHeight + CAPTION_GAP + barcodeHeight + detailHeight
      const blockTop = Math.max(LABEL_PADDING, (LABEL_HEIGHT - blockHeight) / 2)

      doc.image(png, barcodeLeft, blockTop, { width: BARCODE_DISPLAY_WIDTH })

      const captionTop = blockTop + displayHeight + CAPTION_GAP
      doc.fontSize(BARCODE_FONT_SIZE)
      doc.text(barcode, LABEL_PADDING, captionTop, {
        width: captionWidth,
        lineGap: CAPTION_LINE_GAP,
        align: 'center',
      })
      doc.fontSize(CAPTION_FONT_SIZE)
      doc.text(detail, LABEL_PADDING, captionTop + barcodeHeight, {
        width: captionWidth,
        lineGap: CAPTION_LINE_GAP,
        align: 'center',
      })
    })

    doc.end()
  })
}
