import { normalizeName } from 'shared-types'

const MODEL_LIST_SEPARATOR = '/'

const SERIES_REWRITES = [
  { pattern: /\bimagerunner\b/g, replacement: 'ir' },
  { pattern: /\bir\s*adv(ance)?\b/g, replacement: 'ira' },
] as const

function withoutLeadingBrand(text: string, brandNames: readonly string[]): string {
  const brand = brandNames.find((name) => text.startsWith(`${name.toLowerCase()} `))
  if (brand === undefined) return text
  return text.slice(brand.length + 1)
}

export function bidModelLookupKey(text: string, brandNames: readonly string[]): string | null {
  const lowered = text.trim().toLowerCase()
  if (lowered.includes(MODEL_LIST_SEPARATOR)) return null
  const rewritten = SERIES_REWRITES.reduce(
    (current, rule) => current.replace(rule.pattern, rule.replacement),
    withoutLeadingBrand(lowered, brandNames),
  )
  const key = normalizeName(rewritten)
  return key === '' ? null : key
}
