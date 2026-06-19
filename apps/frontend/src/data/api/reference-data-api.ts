import { api } from '@/data/api/axios-client'
import { formatTitleCase } from '@/lib/formatters'
import { type ReferenceData, ReferenceDataSchema } from 'shared-types'

export async function getReferenceData(): Promise<ReferenceData> {
  const { data } = await api.get<ReferenceData>('/reference')
  const referenceData = ReferenceDataSchema.parse(data)
  return {
    ...referenceData,
    assetTypes: referenceData.assetTypes.map(assetType => ({
      ...assetType,
      asset_type: formatTitleCase(assetType.asset_type),
    })),
    components: referenceData.components.map(component => ({
      ...component,
      brand_name: formatTitleCase(component.brand_name),
      name: formatTitleCase(component.name),
    })),
  }
}
