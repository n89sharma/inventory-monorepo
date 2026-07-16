import { PrintLocationBarcodesSchema, successResponse } from 'shared-types'
import { asyncHandler } from '../lib/asyncHandler.js'
import {
  getLocationBarcodeContents as getLocationBarcodeContentsSer,
  getLocations as getLocationsSer,
} from '../services/locationService.js'
import {
  LOCATION_LABEL_LAYOUT,
  generateBarcodePdf as generateBarcodePdfSer,
} from '../services/barcodePrintService.js'

export const getLocations = asyncHandler(async (_req, res) => {
  const locations = await getLocationsSer()
  res.json(successResponse(locations))
})

export const printLocationBarcodes = asyncHandler(async (req, res) => {
  const { locationIds } = PrintLocationBarcodesSchema.parse(req.body)
  const contents = await getLocationBarcodeContentsSer(locationIds)
  const pdf = await generateBarcodePdfSer(contents, LOCATION_LABEL_LAYOUT)
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `inline; filename="location-barcodes-${timestamp}.pdf"`)
  res.send(pdf)
})
