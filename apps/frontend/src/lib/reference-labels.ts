import { formatTitleCase } from './formatters'
import type { AssetType, Brand, Component, ModelSummary, OrgSummary } from 'shared-types'

export const brandLabel = (b: Brand): string => formatTitleCase(b.name)

export const assetTypeLabel = (a: AssetType): string => formatTitleCase(a.asset_type)

export const componentLabel = (c: Component): string =>
  `${formatTitleCase(c.brand_name)} — ${formatTitleCase(c.name)}`

export const organizationLabel = (o: OrgSummary): string => formatTitleCase(o.name)

export const modelLabel = (m: ModelSummary): string =>
  `${formatTitleCase(m.brand_name)} ${formatTitleCase(m.model_name)}`
