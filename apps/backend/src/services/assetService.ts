import { ApiResponse, response400, response500, successResponse } from 'shared-types'
import {
  getAssetAccessories as getAssetAccessoriesQuery,
  getAssetComments as getAssetCommentsQuery,
  getAssetDetails as getAssetDetailsQuery,
  getAssetErrors as getAssetErrorsQuery,
  getAssetParts as getAssetPartsQuery,
  getAssetTransfers as getAssetTransfersQuery
} from '../../generated/prisma/sql.js'
import { prisma } from '../prisma.js'

export async function getAssetDetail(barcode: string) {
  try {
    const assets = await prisma.$queryRawTyped(getAssetDetailsQuery(barcode))
    if (!assets || assets.length === 0) {
      return response400(`Asset ${barcode} not found`)
    }
    return successResponse(assets[0])
  } catch (error) {
    return response500(`Failed to fetch asset ${barcode}`)
  }
}

export async function getAssetAccessories(barcode: string): Promise<ApiResponse<string[]>> {
  try {
    const accessories = await prisma.$queryRawTyped(getAssetAccessoriesQuery(barcode))
    return successResponse(accessories.map(a => a.accessory))
  } catch (error) {
    return response500(`Failed to fetch accessories for ${barcode}`)
  }
}

export async function getAssetErrors(barcode: string) {
  try {
    const errors = await prisma.$queryRawTyped(getAssetErrorsQuery(barcode))
    return successResponse(errors)
  } catch (error) {
    return response500(`Failed to fetch errors for ${barcode}`)
  }
}

export async function getAssetComments(barcode: string) {
  try {
    const comments = await prisma.$queryRawTyped(getAssetCommentsQuery(barcode))
    return successResponse(comments)
  } catch (error) {
    return response500(`Failed to fetch comments for ${barcode}`)
  }
}

export async function getAssetParts(barcode: string) {
  try {
    const parts = await prisma.$queryRawTyped(getAssetPartsQuery(barcode))
    return successResponse(parts)
  } catch (error) {
    return response500(`Failed to fetch parts for ${barcode}`)
  }
}

export async function getAssetTransfers(barcode: string) {
  try {
    const transfers = await prisma.$queryRawTyped(getAssetTransfersQuery(barcode))
    return successResponse(transfers)
  } catch (error) {
    return response500(`Failed to fetch transfers for ${barcode}`)
  }
}
