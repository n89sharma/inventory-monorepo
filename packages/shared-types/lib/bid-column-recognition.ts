import type { BidColumnMapping, BidColumnRole } from '../types/collections/bid-types.js'

export const BID_COLUMN_ROLES = [
  { role: 'BRAND', term: 'make', label: 'Brand' },
  { role: 'MODEL', term: 'model', label: 'Model' },
  { role: 'SERIAL', term: 'serial', label: 'Serial #' },
  { role: 'TOTAL_METER', term: 'meter', label: 'Total Meter' },
  { role: 'ACCESSORIES', term: 'accessor', label: 'Accessories' },
  { role: 'NOTES', term: 'note', label: 'Notes' },
] as const satisfies readonly { role: BidColumnRole; term: string; label: string }[]

export type BidColumnMappingSource = 'automatic' | 'manual'

export type BidColumn =
  | { index: number; header: string; role: BidColumnRole; source: BidColumnMappingSource }
  | { index: number; header: string; role: null; source: null }

function rolesMatching(header: string): BidColumnRole[] {
  const normalized = header.toLowerCase()
  return BID_COLUMN_ROLES.flatMap((entry) => (normalized.includes(entry.term) ? [entry.role] : []))
}

function automaticRoleByIndex(
  headers: readonly string[],
  manualRoleByIndex: ReadonlyMap<number, BidColumnRole>,
): Map<number, BidColumnRole> {
  const manualRoles = new Set(manualRoleByIndex.values())
  const candidates = new Map<BidColumnRole, number[]>()
  headers.forEach((header, index) => {
    if (manualRoleByIndex.has(index)) return
    const [onlyRole, ...otherRoles] = rolesMatching(header)
    if (onlyRole === undefined || otherRoles.length > 0 || manualRoles.has(onlyRole)) return
    candidates.set(onlyRole, [...(candidates.get(onlyRole) ?? []), index])
  })
  const automatic = new Map<number, BidColumnRole>()
  for (const [role, indexes] of candidates) {
    const [onlyIndex, ...otherIndexes] = indexes
    if (onlyIndex !== undefined && otherIndexes.length === 0) automatic.set(onlyIndex, role)
  }
  return automatic
}

export function classifyBidColumns(
  headers: readonly string[],
  manualMappings: readonly BidColumnMapping[] = [],
): BidColumn[] {
  const manualRoleByIndex = new Map(
    manualMappings
      .filter((mapping) => mapping.column_index < headers.length)
      .map((mapping) => [mapping.column_index, mapping.role] as const),
  )
  const automaticByIndex = automaticRoleByIndex(headers, manualRoleByIndex)
  const columns: BidColumn[] = headers.map((header, index) => {
    const manualRole = manualRoleByIndex.get(index)
    if (manualRole !== undefined) return { index, header, role: manualRole, source: 'manual' }
    const automaticRole = automaticByIndex.get(index)
    if (automaticRole !== undefined) {
      return { index, header, role: automaticRole, source: 'automatic' }
    }
    return { index, header, role: null, source: null }
  })
  const mapped = BID_COLUMN_ROLES.flatMap((entry) =>
    columns.filter((column) => column.role === entry.role),
  )
  const unmapped = columns.filter((column) => column.role === null)
  return [...mapped, ...unmapped]
}
