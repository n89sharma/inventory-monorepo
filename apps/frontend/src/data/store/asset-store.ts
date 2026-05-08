import {
  bulkUpdateAssetPricing as bulkUpdateAssetPricingApi,
  createPartTransfer as createPartTransferApi,
  exportAssets as exportAssetsApi,
  getAssetDetail as getAssetDetailApi,
  getLocationsByWarehouse as getLocationsByWarehouseApi,
  postComment as postCommentApi,
  updateAssetErrors as updateAssetErrorsApi,
  updateAssetLocation as updateAssetLocationApi,
  updateAssetPricing as updateAssetPricingApi,
  updateAssetSpecs as updateAssetSpecsApi,
} from '@/data/api/asset-api'
import { getAssetByBarcode as getAssetByBarcodeApi } from '@/data/api/transfer-api'
import { assetDetailKey } from '@/hooks/use-asset-detail'
import type {
  ApiResponse,
  AssetDetails,
  AssetLocation,
  AssetSummary,
  BulkUpdateAssetPricing,
  CreateComment,
  CreatePartTransfer,
  UpdateAssetLocation,
  UpdateAssetPricing,
  UpdateAssetSpecs,
  UpdateError,
} from 'shared-types'
import { mutate } from 'swr'
import { create } from 'zustand'

interface AssetStore {
  updateAssetErrors: (barcode: string, errors: UpdateError[]) => Promise<ApiResponse<void>>
  createPartTransfer: (barcode: string, data: CreatePartTransfer) => Promise<ApiResponse<void>>
  createComment: (barcode: string, data: CreateComment) => Promise<ApiResponse<void>>
  updateAssetLocation: (barcode: string, data: UpdateAssetLocation) => Promise<ApiResponse<void>>
  updateAssetPricing: (barcode: string, data: UpdateAssetPricing) => Promise<ApiResponse<void>>
  updateAssetSpecs: (barcode: string, data: UpdateAssetSpecs) => Promise<ApiResponse<void>>
  getAssetByBarcode: (barcode: string) => Promise<AssetSummary>
  getAssetDetail: (barcode: string) => Promise<AssetDetails>
  getLocationsByWarehouse: (warehouseId: number) => Promise<ApiResponse<AssetLocation[]>>
  exportAssets: (barcodes: string[], filename?: string) => Promise<void>
  bulkUpdatePricing: (items: BulkUpdateAssetPricing['items']) => Promise<ApiResponse<void>>
}

export const useAssetStore = create<AssetStore>(() => ({
  updateAssetErrors: async (barcode, errors) => {
    const response = await updateAssetErrorsApi(barcode, errors)
    if (response.success) mutate(assetDetailKey(barcode))
    return response
  },

  createPartTransfer: async (barcode, data) => {
    const response = await createPartTransferApi(barcode, data)
    if (response.success) mutate(assetDetailKey(barcode))
    return response
  },

  createComment: async (barcode, data) => {
    const response = await postCommentApi(barcode, data)
    if (response.success) mutate(assetDetailKey(barcode))
    return response
  },

  updateAssetLocation: async (barcode, data) => {
    const response = await updateAssetLocationApi(barcode, data)
    if (response.success) mutate(assetDetailKey(barcode))
    return response
  },

  updateAssetPricing: async (barcode, data) => {
    const response = await updateAssetPricingApi(barcode, data)
    if (response.success) mutate(assetDetailKey(barcode))
    return response
  },

  updateAssetSpecs: async (barcode, data) => {
    const response = await updateAssetSpecsApi(barcode, data)
    if (response.success) mutate(assetDetailKey(barcode))
    return response
  },

  getAssetByBarcode: (barcode) => getAssetByBarcodeApi(barcode),

  getAssetDetail: (barcode) => getAssetDetailApi({ barcode }),

  getLocationsByWarehouse: (warehouseId) => getLocationsByWarehouseApi(warehouseId),

  exportAssets: (barcodes, filename) => exportAssetsApi(barcodes, filename),

  bulkUpdatePricing: async (items) => {
    const response = await bulkUpdateAssetPricingApi(items)
    if (response.success) items.forEach(item => mutate(assetDetailKey(item.barcode)))
    return response
  },
}))
