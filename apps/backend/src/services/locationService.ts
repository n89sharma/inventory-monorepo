import { LocationSummary } from 'shared-types'
import { getLocations as getLocationsQuery } from '../../generated/prisma/sql.js'
import { prisma } from '../prisma.js'
import { type BarcodeContent } from './barcodePrintService.js'

const BIN_ZONE = 'BIN'

function locationBarcodeValue(zone: string, bin: string): string {
  return zone === BIN_ZONE ? bin : zone
}

export async function getLocations(): Promise<LocationSummary[]> {
  return prisma.$queryRawTyped(getLocationsQuery())
}

export async function getLocationBarcodeContents(ids: number[]): Promise<BarcodeContent[]> {
  const wanted = new Set(ids)
  const rows = (await getLocations()).filter((row) => wanted.has(row.id))
  return rows.map((row) => {
    const value = locationBarcodeValue(row.zone, row.bin)
    return { barcode: value, primary: value, secondary: [] }
  })
}
