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
  updateAssetErrors: (barcode: string, errors: UpdateError[]) => Promise<void>
  createPartTransfer: (barcode: string, data: CreatePartTransfer) => Promise<void>
  createComment: (barcode: string, data: CreateComment) => Promise<void>
  updateAssetLocation: (barcode: string, data: UpdateAssetLocation) => Promise<void>
  updateAssetPricing: (barcode: string, data: UpdateAssetPricing) => Promise<void>
  updateAssetSpecs: (barcode: string, data: UpdateAssetSpecs) => Promise<void>
  getAssetByBarcode: (barcode: string) => Promise<AssetSummary>
  getAssetDetail: (barcode: string) => Promise<AssetDetails>
  getLocationsByWarehouse: (warehouseId: number) => Promise<AssetLocation[]>
  exportAssets: (barcodes: string[], filename?: string) => Promise<void>
  bulkUpdatePricing: (items: BulkUpdateAssetPricing['items']) => Promise<void>
}

export const useAssetStore = create<AssetStore>(() => ({
  updateAssetErrors: async (barcode, errors) => {
    await updateAssetErrorsApi(barcode, errors)
    mutate(assetDetailKey(barcode))
  },

  createPartTransfer: async (barcode, data) => {
    await createPartTransferApi(barcode, data)
    mutate(assetDetailKey(barcode))
  },

  createComment: async (barcode, data) => {
    await postCommentApi(barcode, data)
    mutate(assetDetailKey(barcode))
  },

  updateAssetLocation: async (barcode, data) => {
    await updateAssetLocationApi(barcode, data)
    mutate(assetDetailKey(barcode))
  },

  updateAssetPricing: async (barcode, data) => {
    await updateAssetPricingApi(barcode, data)
    mutate(assetDetailKey(barcode))
  },

  updateAssetSpecs: async (barcode, data) => {
    await updateAssetSpecsApi(barcode, data)
    mutate(assetDetailKey(barcode))
  },

  getAssetByBarcode: (barcode) => getAssetByBarcodeApi(barcode),

  getAssetDetail: (barcode) => getAssetDetailApi({ barcode }),

  getLocationsByWarehouse: (warehouseId) => getLocationsByWarehouseApi(warehouseId),

  exportAssets: (barcodes, filename) => exportAssetsApi(barcodes, filename),

  bulkUpdatePricing: async (items) => {
    await bulkUpdateAssetPricingApi(items)
    items.forEach(item => mutate(assetDetailKey(item.barcode)))
  },
}))
