import { successResponse } from 'shared-types'
import { asyncHandler } from '../lib/asyncHandler.js'
import { getReferenceData as getReferenceDataSer } from '../services/referenceService.js'

export const getReferenceData = asyncHandler(async (req, res) => {
  const data = await getReferenceDataSer()
  res.json(successResponse(data))
})
