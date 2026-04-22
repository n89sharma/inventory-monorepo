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
  //entities
  assetDetails: AssetDetails | null
  accessories: string[]
  errors: AssetError[]
  comments: Comment[]
  transfers: AssetTransfer[]
  partTransfers: PartTransfer[]
  loading: boolean
  error: string | null
  assetCache: Record<string, AssetCacheEntry>

  //actions
  setAssetDetails: (assetDetails: AssetDetails) => void
  setAssetAccessories: (accessories: string[]) => void
  setAssetErrors: (errors: AssetError[]) => void
  setAssetComments: (comments: Comment[]) => void
  setAssetTransfers: (transfers: AssetTransfer[]) => void
  setAssetPartTransfers: (partTransfers: PartTransfer[]) => void
  getAssetDetails: (barcode: string) => Promise<void>
  prefetchAssetDetails: (barcode: string) => Promise<void>
  updateAssetErrors: (barcode: string, errors: UpdateError[]) => Promise<ApiResponse<void>>
  createPartTransfer: (barcode: string, data: CreatePartTransfer) => Promise<ApiResponse<void>>
  createComment: (barcode: string, data: CreateComment) => Promise<ApiResponse<void>>

  //clear state
  clearAssetStore: () => void
}

export const useAssetStore = create<AssetStore>((set, get) => ({
  assetDetails: null,
  accessories: [],
  errors: [],
  comments: [],
  transfers: [],
  partTransfers: [],
  loading: false,
  error: null,
  assetCache: {},

  setAssetDetails: (assetDetails) => set({ assetDetails }),
  setAssetAccessories: (accessories) => set({ accessories }),
  setAssetErrors: (errors) => set({ errors }),
  setAssetComments: (comments) => set({ comments }),
  setAssetTransfers: (transfers) => set({ transfers }),
  setAssetPartTransfers: (parts) => set({ partTransfers: parts }),
  getAssetDetails: async (barcode) => {
    const cached = get().assetCache[barcode]
    if (cached) {
      set({ assetDetails: cached.assetDetails, accessories: cached.accessories, errors: cached.errors, comments: cached.comments, transfers: cached.transfers, partTransfers: cached.partTransfers })
      return
    }
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
  prefetchAssetDetails: async (barcode) => {
    if (get().assetCache[barcode]) return
    try {
      const r = await getAllAssetDetails(barcode)
      const entry: AssetCacheEntry = {
        assetDetails: r.assetDetails.status === 'fulfilled' ? r.assetDetails.result : null,
        accessories: r.assetAccessories.status === 'fulfilled' ? r.assetAccessories.result : [],
        errors: r.assetErrors.status === 'fulfilled' ? r.assetErrors.result : [],
        comments: r.assetComments.status === 'fulfilled' ? r.assetComments.result : [],
        transfers: r.assetTransfers.status === 'fulfilled' ? r.assetTransfers.result : [],
        partTransfers: r.assetPartTransfers.status === 'fulfilled' ? r.assetPartTransfers.result : [],
      }
      set(produce(draft => { draft.assetCache[barcode] = entry }))
    } catch {
      // silently swallow — asset page will fetch normally on navigation
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
