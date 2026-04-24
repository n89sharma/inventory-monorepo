import { createPartTransfer as createPartTransferApi, postComment as postCommentApi, updateAssetErrors as updateAssetErrorsApi } from '@/data/api/asset-api'
import { assetDetailKey } from '@/hooks/use-asset-detail'
import type { ApiResponse, CreateComment, CreatePartTransfer, UpdateError } from 'shared-types'
import { mutate } from 'swr'
import { create } from 'zustand'

interface AssetStore {
  updateAssetErrors: (barcode: string, errors: UpdateError[]) => Promise<ApiResponse<void>>
  createPartTransfer: (barcode: string, data: CreatePartTransfer) => Promise<ApiResponse<void>>
  createComment: (barcode: string, data: CreateComment) => Promise<ApiResponse<void>>
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
}))
