import { createPartTransfer as createPartTransferApi, getAllAssetDetails, getAssetComments, getAssetErrors, getAssetPartTransfers, postComment as postCommentApi, updateAssetErrors as updateAssetErrorsApi } from '@/data/api/asset-api'
import { produce } from 'immer'
import type { ApiResponse, AssetDetails, AssetError, AssetTransfer, Comment, CreateComment, CreatePartTransfer, PartTransfer, UpdateError } from 'shared-types'
import { create } from 'zustand'

type AssetCacheEntry = {
  assetDetails: AssetDetails | null
  accessories: string[]
  errors: AssetError[]
  comments: Comment[]
  transfers: AssetTransfer[]
  partTransfers: PartTransfer[]
}

interface AssetStore {
  assetDetailCache: Record<string, AssetCacheEntry>
  detailLoading: boolean
  detailError: string | null

  getAssetDetails: (barcode: string) => Promise<void>
updateAssetErrors: (barcode: string, errors: UpdateError[]) => Promise<ApiResponse<void>>
  createPartTransfer: (barcode: string, data: CreatePartTransfer) => Promise<ApiResponse<void>>
  createComment: (barcode: string, data: CreateComment) => Promise<ApiResponse<void>>
}

export const useAssetStore = create<AssetStore>((set, get) => ({
  assetDetailCache: {},
  detailLoading: false,
  detailError: null,

  getAssetDetails: async (barcode) => {
    if (get().assetDetailCache[barcode]) return
    set({ detailLoading: true, detailError: null })
    try {
      const r = await getAllAssetDetails(barcode)
      set(produce((draft: AssetStore) => {
        draft.assetDetailCache[barcode] = {
          assetDetails: r.assetDetails.status === 'fulfilled' ? r.assetDetails.result : null,
          accessories: r.assetAccessories.status === 'fulfilled' ? r.assetAccessories.result : [],
          errors: r.assetErrors.status === 'fulfilled' ? r.assetErrors.result : [],
          comments: r.assetComments.status === 'fulfilled' ? r.assetComments.result : [],
          transfers: r.assetTransfers.status === 'fulfilled' ? r.assetTransfers.result : [],
          partTransfers: r.assetPartTransfers.status === 'fulfilled' ? r.assetPartTransfers.result : [],
        }
      }))
    } catch (e) {
      set({ detailError: e instanceof Error ? e.message : 'Failed to load asset details' })
    } finally {
      set({ detailLoading: false })
    }
  },

  updateAssetErrors: async (barcode, errors) => {
    const response = await updateAssetErrorsApi(barcode, errors)
    if (response.success) {
      const updated = await getAssetErrors({ barcode })
      set(produce((draft: AssetStore) => {
        if (draft.assetDetailCache[barcode]) draft.assetDetailCache[barcode].errors = updated
      }))
    }
    return response
  },

  createPartTransfer: async (barcode, data) => {
    const response = await createPartTransferApi(barcode, data)
    if (response.success) {
      const updated = await getAssetPartTransfers({ barcode })
      set(produce((draft: AssetStore) => {
        if (draft.assetDetailCache[barcode]) draft.assetDetailCache[barcode].partTransfers = updated
      }))
    }
    return response
  },

  createComment: async (barcode, data) => {
    const response = await postCommentApi(barcode, data)
    if (response.success) {
      const updated = await getAssetComments({ barcode })
      set(produce((draft: AssetStore) => {
        if (draft.assetDetailCache[barcode]) draft.assetDetailCache[barcode].comments = updated
      }))
    }
    return response
  },
}))
