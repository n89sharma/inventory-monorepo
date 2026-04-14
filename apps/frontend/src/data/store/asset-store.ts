import { getAllAssetDetails } from '@/data/api/asset-api'
import type { AssetDetails, AssetError, AssetTransfer, Comment, Part } from 'shared-types'
import { create } from 'zustand'

interface AssetStore {
  //entities
  assetDetails: AssetDetails | null
  accessories: string[]
  errors: AssetError[]
  comments: Comment[]
  transfers: AssetTransfer[]
  parts: Part[]
  loading: boolean
  error: string | null

  //actions
  setAssetDetails: (assetDetails: AssetDetails) => void
  setAssetAccessories: (accessories: string[]) => void
  setAssetErrors: (errors: AssetError[]) => void
  setAssetComments: (comments: Comment[]) => void
  setAssetTransfers: (transfers: AssetTransfer[]) => void
  setAssetParts: (parts: Part[]) => void
  getAssetDetails: (barcode: string) => Promise<void>

  //clear state
  clearAssetStore: () => void
}

export const useAssetStore = create<AssetStore>((set) => ({
  assetDetails: null,
  accessories: [],
  errors: [],
  comments: [],
  transfers: [],
  parts: [],
  loading: false,
  error: null,

  setAssetDetails: (assetDetails) => set({ assetDetails }),
  setAssetAccessories: (accessories) => set({ accessories }),
  setAssetErrors: (errors) => set({ errors }),
  setAssetComments: (comments) => set({ comments }),
  setAssetTransfers: (transfers) => set({ transfers }),
  setAssetParts: (parts) => set({ parts }),
  getAssetDetails: async (barcode) => {
    set({ loading: true, error: null, assetDetails: null, accessories: [], errors: [], comments: [], transfers: [], parts: [] })
    try {
      const r = await getAllAssetDetails(barcode)
      if (r.assetDetails.status === 'fulfilled') set({ assetDetails: r.assetDetails.result })
      if (r.assetAccessories.status === 'fulfilled') set({ accessories: r.assetAccessories.result })
      if (r.assetErrors.status === 'fulfilled') set({ errors: r.assetErrors.result })
      if (r.assetComments.status === 'fulfilled') set({ comments: r.assetComments.result })
      if (r.assetTransfers.status === 'fulfilled') set({ transfers: r.assetTransfers.result })
      if (r.assetParts.status === 'fulfilled') set({ parts: r.assetParts.result })
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to load asset details' })
    } finally {
      set({ loading: false })
    }
  },

  clearAssetStore: () => set({
    assetDetails: null,
    accessories: [],
    errors: [],
    comments: [],
    transfers: [],
    parts: []
  })
}))
