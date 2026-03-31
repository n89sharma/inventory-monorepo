import { Request, Response } from 'express'
import { ApiResponse, ReferenceData } from 'shared-types'
import { getReferenceData as getReferenceDataSer } from '../services/referenceService.js'

export async function getReferenceData(req: Request, res: Response<ApiResponse<ReferenceData>>) {
  const response = await getReferenceDataSer()
  if (response.success) {
    return res.json(response)
  } else {
    return res.status(500).json(response)
  }
}
