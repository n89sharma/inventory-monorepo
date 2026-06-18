import {
  bulkUpdateAssetPricing as bulkUpdateAssetPricingApi,
  createAssetHarvestedPart as createAssetHarvestedPartApi,
  exportAssets as exportAssetsApi,
  getAssetDetail as getAssetDetailApi,
  getLocationsByWarehouse as getLocationsByWarehouseApi,
  postComment as postCommentApi,
  updateAssetErrors as updateAssetErrorsApi,
  updateAssetLocation as updateAssetLocationApi,
  updateAssetPricing as updateAssetPricingApi,
  updateAssetSpecs as updateAssetSpecsApi,
} from '@/data/api/asset-api'
import { addStorePartToAsset as addStorePartToAssetApi } from '@/data/api/store-part-api'
import { getAssetByBarcode as getAssetByBarcodeApi } from '@/data/api/transfer-api'
import { assetDetailKey, invalidateAssetDetails } from '@/hooks/use-asset-detail'
import { invalidateAssetHistory } from '@/hooks/use-asset-history'
import { invalidateStorePartLists, storePartDetailKey } from '@/hooks/use-store-part'
import type {
  AssetDetails,
  AssetLocation,
  AssetSummary,
  BulkUpdateAssetPricing,
  CreateComment,
  CreateSalvagedPart,
  AddPurchaseResponse,
  ReportVariant,
  UpdateAssetLocation,
  UpdateAssetPricing,
  UpdateAssetSpecs,
  UpdateError,
} from 'shared-types'
import type { AddStorePartForm } from '@/ui-types/store-part-form-types'
import { mutate } from 'swr'
import { create } from 'zustand'

interface AssetStore {
  updateAssetErrors: (barcode: string, errors: UpdateError[]) => Promise<void>
  createAssetHarvestedPart: (barcode: string, data: CreateSalvagedPart) => Promise<void>
  addStorePartToAsset: (barcode: string, form: AddStorePartForm) => Promise<AddPurchaseResponse>
  createComment: (barcode: string, data: CreateComment) => Promise<void>
  updateAssetLocation: (barcode: string, data: UpdateAssetLocation) => Promise<void>
  updateAssetPricing: (barcode: string, data: UpdateAssetPricing) => Promise<void>
  updateAssetSpecs: (barcode: string, data: UpdateAssetSpecs) => Promise<void>
  getAssetByBarcode: (barcode: string) => Promise<AssetSummary>
  getAssetDetail: (barcode: string) => Promise<AssetDetails>
  getLocationsByWarehouse: (warehouseId: number) => Promise<AssetLocation[]>
  exportAssets: (
    barcodes: string[],
    filename?: string,
    variant?: ReportVariant,
    columnKeys?: string[],
  ) => Promise<void>
  bulkUpdatePricing: (items: BulkUpdateAssetPricing['items']) => Promise<void>
}

export const useAssetStore = create<AssetStore>(() => ({
  updateAssetErrors: async (barcode, errors) => {
    await updateAssetErrorsApi(barcode, errors)
    mutate(assetDetailKey(barcode))
    invalidateAssetHistory([barcode])
  },

  createAssetHarvestedPart: async (barcode, data) => {
    await createAssetHarvestedPartApi(barcode, data)
    invalidateAssetDetails([barcode, data.donor_barcode])
  },

  addStorePartToAsset: async (barcode, form) => {
    const result = await addStorePartToAssetApi(barcode, form)
    invalidateAssetDetails([barcode])
    invalidateStorePartLists()
    mutate(storePartDetailKey(result.part_number))
    return result
  },

  createComment: async (barcode, data) => {
    await postCommentApi(barcode, data)
    mutate(assetDetailKey(barcode))
  },

  updateAssetLocation: async (barcode, data) => {
    await updateAssetLocationApi(barcode, data)
    mutate(assetDetailKey(barcode))
    invalidateAssetHistory([barcode])
  },

  updateAssetPricing: async (barcode, data) => {
    await updateAssetPricingApi(barcode, data)
    mutate(assetDetailKey(barcode))
    invalidateAssetHistory([barcode])
  },

  updateAssetSpecs: async (barcode, data) => {
    await updateAssetSpecsApi(barcode, data)
    mutate(assetDetailKey(barcode))
    invalidateAssetHistory([barcode])
  },

  getAssetByBarcode: (barcode) => getAssetByBarcodeApi(barcode),

  getAssetDetail: (barcode) => getAssetDetailApi({ barcode }),

  getLocationsByWarehouse: (warehouseId) => getLocationsByWarehouseApi(warehouseId),

  exportAssets: (barcodes, filename, variant, columnKeys) =>
    exportAssetsApi(barcodes, filename, variant, columnKeys),

  bulkUpdatePricing: async (items) => {
    await bulkUpdateAssetPricingApi(items)
    const barcodes = items.map(item => item.barcode)
    invalidateAssetDetails(barcodes)
    invalidateAssetHistory(barcodes)
  },
}))
