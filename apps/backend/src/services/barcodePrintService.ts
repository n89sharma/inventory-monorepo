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
  includetext: true,
  textxalign: 'center',
} as const

const PAGE_MARGIN = 40
const BARCODE_DISPLAY_WIDTH = 240
const ROW_GAP = 24

const CAPTION_FONT_SIZE = 9
const CAPTION_GAP = 6
const CAPTION_LINE_GAP = 2

const PNG_WIDTH_OFFSET = 16
const PNG_HEIGHT_OFFSET = 20

const NUMBER_FMT = new Intl.NumberFormat('en-US')
const EMPTY_METER = '—'

function formatMeter(value: number | null): string {
  return value == null ? EMPTY_METER : NUMBER_FMT.format(value)
}

function captionLines(label: BarcodeLabel): [string, string] {
  const identity = `${label.brand} · ${label.model} · ${label.serialNumber}`
  const meters = `Total ${formatMeter(label.meterTotal)} / Black ${formatMeter(
    label.meterBlack,
  )} / Colour ${formatMeter(label.meterColour)}`
  return [identity, meters]
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

      const [line1, line2] = captionLines(label)
      doc.font('Helvetica').fontSize(CAPTION_FONT_SIZE)
      const caption = `${line1}\n${line2}`
      const captionHeight = doc.heightOfString(caption, {
        width: BARCODE_DISPLAY_WIDTH,
        lineGap: CAPTION_LINE_GAP,
      })
      const blockHeight = displayHeight + CAPTION_GAP + captionHeight

      if (doc.y + blockHeight > doc.page.height - PAGE_MARGIN) {
        doc.addPage()
      }

      const blockTop = doc.y
      doc.image(png, PAGE_MARGIN, blockTop, { width: BARCODE_DISPLAY_WIDTH })
      doc.text(caption, PAGE_MARGIN, blockTop + displayHeight + CAPTION_GAP, {
        width: BARCODE_DISPLAY_WIDTH,
        lineGap: CAPTION_LINE_GAP,
      })
      doc.y = blockTop + blockHeight + ROW_GAP
    })

    doc.end()
  })
}
