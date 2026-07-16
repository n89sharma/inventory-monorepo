import { z } from 'zod'

const MAX_EXPORT_BARCODES = 2000

export const PrintBarcodesSchema = z.object({
  barcodes: z.array(z.string()).min(1).max(MAX_EXPORT_BARCODES),
})

export type PrintBarcodes = z.infer<typeof PrintBarcodesSchema>
