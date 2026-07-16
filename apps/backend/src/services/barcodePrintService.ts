import { toBuffer } from 'bwip-js'
import PDFDocument from 'pdfkit'

export type BarcodeContent = {
  barcode: string
  primary: string
  secondary: string[]
}

export type LabelLayout = {
  width: number
  height: number
  padding: number
  barcodeDisplayWidth: number
  primaryFontSize: number
  secondaryFontSize: number
}

const BARCODE_OPTIONS = {
  bcid: 'code128',
  scale: 3,
  height: 12,
  includetext: false,
} as const

const CAPTION_GAP = 2
const CAPTION_LINE_GAP = 1

const PNG_WIDTH_OFFSET = 16
const PNG_HEIGHT_OFFSET = 20

export const ASSET_LABEL_LAYOUT = {
  width: 288, // 4in at 72pt
  height: 144, // 2in at 72pt
  padding: 6,
  barcodeDisplayWidth: 240,
  primaryFontSize: 16,
  secondaryFontSize: 13,
} as const satisfies LabelLayout

export const LOCATION_LABEL_LAYOUT = {
  width: 432, // 6in at 72pt
  height: 288, // 4in at 72pt
  padding: 12,
  barcodeDisplayWidth: 360,
  primaryFontSize: 48,
  secondaryFontSize: 20,
} as const satisfies LabelLayout

export async function generateBarcodePdf(
  contents: BarcodeContent[],
  layout: LabelLayout,
): Promise<Buffer> {
  const images = await Promise.all(
    contents.map((content) => toBuffer({ ...BARCODE_OPTIONS, text: content.barcode })),
  )

  return await new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: [layout.width, layout.height],
      margin: layout.padding,
    })

    const chunks: Buffer[] = []
    doc.on('data', (chunk) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const captionWidth = layout.width - layout.padding * 2
    const barcodeLeft = (layout.width - layout.barcodeDisplayWidth) / 2

    contents.forEach((content, index) => {
      if (index > 0) doc.addPage()

      const png = images[index]
      const pixelWidth = png.readUInt32BE(PNG_WIDTH_OFFSET)
      const pixelHeight = png.readUInt32BE(PNG_HEIGHT_OFFSET)
      const displayHeight = layout.barcodeDisplayWidth * (pixelHeight / pixelWidth)

      const detail = content.secondary.join('\n')

      doc.font('Helvetica').fontSize(layout.primaryFontSize)
      const primaryHeight = doc.heightOfString(content.primary, {
        width: captionWidth,
        lineGap: CAPTION_LINE_GAP,
      })
      doc.fontSize(layout.secondaryFontSize)
      const detailHeight = detail
        ? doc.heightOfString(detail, { width: captionWidth, lineGap: CAPTION_LINE_GAP })
        : 0
      const blockHeight = displayHeight + CAPTION_GAP + primaryHeight + detailHeight
      const blockTop = Math.max(layout.padding, (layout.height - blockHeight) / 2)

      doc.image(png, barcodeLeft, blockTop, { width: layout.barcodeDisplayWidth })

      const captionTop = blockTop + displayHeight + CAPTION_GAP
      doc.fontSize(layout.primaryFontSize)
      doc.text(content.primary, layout.padding, captionTop, {
        width: captionWidth,
        lineGap: CAPTION_LINE_GAP,
        align: 'center',
      })
      if (detail) {
        doc.fontSize(layout.secondaryFontSize)
        doc.text(detail, layout.padding, captionTop + primaryHeight, {
          width: captionWidth,
          lineGap: CAPTION_LINE_GAP,
          align: 'center',
        })
      }
    })

    doc.end()
  })
}
