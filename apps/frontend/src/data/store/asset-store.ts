import type { AssetDetails, AssetTransfer, Comment, Error, Part } from 'shared-types'
import { create } from 'zustand'

interface AssetStore {
  //entities
  assetDetails: AssetDetails | null
  accessories: string[]
  errors: Error[]
  comments: Comment[]
  transfers: AssetTransfer[]
  parts: Part[]

  //actions
  setAssetDetails: (assetDetails: AssetDetails) => void
  setAssetAccessories: (accessories: string[]) => void
  setAssetErrors: (errors: Error[]) => void
  setAssetComments: (comments: Comment[]) => void
  setAssetTransfers: (transfers: AssetTransfer[]) => void
  setAssetParts: (parts: Part[]) => void

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

  setAssetDetails: (assetDetails) => set({ assetDetails }),
  setAssetAccessories: (accessories) => set({ accessories }),
  setAssetErrors: (errors) => set({ errors }),
  setAssetComments: (comments) => set({ comments }),
  setAssetTransfers: (transfers) => set({ transfers }),
  setAssetParts: (parts) => set({ parts }),

  clearAssetStore: () => set({
    assetDetails: null,
    accessories: [],
    errors: [],
    comments: [],
    transfers: [],
    parts: []
  })
}))