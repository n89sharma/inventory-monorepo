import { z } from 'zod'

export const MAX_BULK_ASSET_COUNT = 3500

export const PrintBarcodesSchema = z.object({
  barcodes: z.array(z.string()).min(1).max(MAX_BULK_ASSET_COUNT),
})

export type PrintBarcodes = z.infer<typeof PrintBarcodesSchema>

export const PrintLocationBarcodesSchema = z.object({
  locationIds: z.array(z.number()).min(1),
})

export type PrintLocationBarcodes = z.infer<typeof PrintLocationBarcodesSchema>
