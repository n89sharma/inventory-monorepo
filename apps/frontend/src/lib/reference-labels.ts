import type { Component, ModelSummary } from 'shared-types'

export const componentLabel = (c: Component): string => `${c.brand_name} — ${c.name}`

export const modelLabel = (m: ModelSummary): string => `${m.brand_name} ${m.model_name}`
