import { useParams } from "react-router-dom"
import type { NavigationSection } from 'shared-types'

interface AssetDetailsParams {
  section: NavigationSection
  collectionId: string | null
  assetId: string
}

export function useAssetDetailsParams(): AssetDetailsParams {
  const { section, collectionId, assetId } = useParams<{
    section: string
    collectionId: string
    assetId: string
  }>()

  if (assetId === undefined)
    throw new Error('Asset ID must be provided for asset detail page route')

  // url:/arrivals/123/789
  if (assetId && section && collectionId) {
    return { section: section as NavigationSection, collectionId, assetId };
  }

  return { section: 'search' as NavigationSection, collectionId: null, assetId }

}