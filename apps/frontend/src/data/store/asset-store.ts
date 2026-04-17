import { createPartTransfer as createPartTransferApi, getAllAssetDetails, getAssetComments, getAssetErrors, getAssetPartTransfers, postComment as postCommentApi, updateAssetErrors as updateAssetErrorsApi } from '@/data/api/asset-api'
import type { ApiResponse, AssetDetails, AssetError, AssetTransfer, Comment, CreateComment, CreatePartTransfer, PartTransfer, UpdateError } from 'shared-types'
import { create } from 'zustand'

interface AssetStore {
  //entities
  assetDetails: AssetDetails | null
  accessories: string[]
  errors: AssetError[]
  comments: Comment[]
  transfers: AssetTransfer[]
  partTransfers: PartTransfer[]
  loading: boolean
  error: string | null

  //actions
  setAssetDetails: (assetDetails: AssetDetails) => void
  setAssetAccessories: (accessories: string[]) => void
  setAssetErrors: (errors: AssetError[]) => void
  setAssetComments: (comments: Comment[]) => void
  setAssetTransfers: (transfers: AssetTransfer[]) => void
  setAssetPartTransfers: (partTransfers: PartTransfer[]) => void
  getAssetDetails: (barcode: string) => Promise<void>
  updateAssetErrors: (barcode: string, errors: UpdateError[]) => Promise<ApiResponse<void>>
  createPartTransfer: (barcode: string, data: CreatePartTransfer) => Promise<ApiResponse<void>>
  createComment: (barcode: string, data: CreateComment) => Promise<ApiResponse<void>>

  //clear state
  clearAssetStore: () => void
}

export const useAssetStore = create<AssetStore>((set) => ({
  assetDetails: null,
  accessories: [],
  errors: [],
  comments: [],
  transfers: [],
  partTransfers: [],
  loading: false,
  error: null,

  setAssetDetails: (assetDetails) => set({ assetDetails }),
  setAssetAccessories: (accessories) => set({ accessories }),
  setAssetErrors: (errors) => set({ errors }),
  setAssetComments: (comments) => set({ comments }),
  setAssetTransfers: (transfers) => set({ transfers }),
  setAssetPartTransfers: (parts) => set({ partTransfers: parts }),
  getAssetDetails: async (barcode) => {
    set({ loading: true, error: null, assetDetails: null, accessories: [], errors: [], comments: [], transfers: [], partTransfers: [] })
    try {
      const r = await getAllAssetDetails(barcode)
      if (r.assetDetails.status === 'fulfilled') set({ assetDetails: r.assetDetails.result })
      if (r.assetAccessories.status === 'fulfilled') set({ accessories: r.assetAccessories.result })
      if (r.assetErrors.status === 'fulfilled') set({ errors: r.assetErrors.result })
      if (r.assetComments.status === 'fulfilled') set({ comments: r.assetComments.result })
      if (r.assetTransfers.status === 'fulfilled') set({ transfers: r.assetTransfers.result })
      if (r.assetPartTransfers.status === 'fulfilled') set({ partTransfers: r.assetPartTransfers.result })
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to load asset details' })
    } finally {
      set({ loading: false })
    }
  },

  updateAssetErrors: async (barcode, errors) => {
    const response = await updateAssetErrorsApi(barcode, errors)
    if (response.success) {
      const updated = await getAssetErrors({ barcode })
      set({ errors: updated })
    }
    return response
  },

  createPartTransfer: async (barcode, data) => {
    const response = await createPartTransferApi(barcode, data)
    if (response.success) {
      const updated = await getAssetPartTransfers({ barcode })
      set({ partTransfers: updated })
    }
    return response
  },

  createComment: async (barcode, data) => {
    const response = await postCommentApi(barcode, data)
    if (response.success) {
      const updated = await getAssetComments({ barcode })
      set({ comments: updated })
    }
    return response
  },

  clearAssetStore: () => set({
    assetDetails: null,
    accessories: [],
    errors: [],
    comments: [],
    transfers: [],
    partTransfers: []
  })
}))
