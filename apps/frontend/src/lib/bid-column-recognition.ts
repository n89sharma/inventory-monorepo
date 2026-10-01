const BID_COLUMN_ROLES = [
  { term: 'make', label: 'Brand' },
  { term: 'model', label: 'Model' },
  { term: 'serial', label: 'Serial #' },
  { term: 'meter', label: 'Total Meter' },
  { term: 'accessor', label: 'Accessories' },
  { term: 'note', label: 'Notes' },
] as const

export type BidColumn = {
  index: number
  label: string
  recognized: boolean
}

function rolesMatching(header: string): number[] {
  const normalized = header.toLowerCase()
  return BID_COLUMN_ROLES.flatMap((role, roleIndex) =>
    normalized.includes(role.term) ? [roleIndex] : [],
  )
}

function headerIndexByRole(headers: readonly string[]): Map<number, number> {
  const candidates = new Map<number, number[]>()
  headers.forEach((header, headerIndex) => {
    const roles = rolesMatching(header)
    const [onlyRole] = roles
    if (roles.length !== 1 || onlyRole === undefined) return
    candidates.set(onlyRole, [...(candidates.get(onlyRole) ?? []), headerIndex])
  })
  const recognized = new Map<number, number>()
  for (const [roleIndex, headerIndexes] of candidates) {
    const [onlyHeader] = headerIndexes
    if (headerIndexes.length === 1 && onlyHeader !== undefined) {
      recognized.set(roleIndex, onlyHeader)
    }
  }
  return recognized
}

export function classifyBidColumns(headers: readonly string[]): BidColumn[] {
  const recognized = headerIndexByRole(headers)
  const recognizedColumns: BidColumn[] = BID_COLUMN_ROLES.flatMap((role, roleIndex) => {
    const index = recognized.get(roleIndex)
    return index === undefined ? [] : [{ index, label: role.label, recognized: true }]
  })
  const recognizedIndexes = new Set(recognizedColumns.map((column) => column.index))
  const unknownColumns: BidColumn[] = headers.flatMap((header, index) =>
    recognizedIndexes.has(index) ? [] : [{ index, label: header, recognized: false }],
  )
  return [...recognizedColumns, ...unknownColumns]
}
