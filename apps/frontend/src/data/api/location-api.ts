import { api } from '@/data/api/axios-client'
import { printPdfBlob } from '@/lib/print-pdf'
import {
  type LocationSummary,
  LocationSummarySchema,
  PrintLocationBarcodesSchema,
} from 'shared-types'
import { z } from 'zod'

export async function getLocations(): Promise<LocationSummary[]> {
  const { data } = await api.get<LocationSummary[]>('/locations')
  return z.array(LocationSummarySchema).parse(data)
}

export async function printLocationBarcodes(locationIds: number[]): Promise<void> {
  const printLocationBarcodesBody = PrintLocationBarcodesSchema.parse({
    locationIds,
  } satisfies z.input<typeof PrintLocationBarcodesSchema>)
  await printPdfBlob('/locations/barcodes/print', printLocationBarcodesBody)
}
