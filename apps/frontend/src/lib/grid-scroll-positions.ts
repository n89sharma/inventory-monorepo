import { z } from 'zod'

const STORAGE_KEY = 'loon-grid-scroll-positions'
// One entry per grid per path, so the store only grows with how many list pages a session
// visits. The cap stops that from growing without bound.
const MAX_ENTRIES = 30

// rowCount travels with the offset because it is what identifies the result set: the same
// path with different filters is a different list, and restoring into it would drop the reader
// somewhere arbitrary.
const GridScrollPositionSchema = z.object({
  top: z.number(),
  left: z.number(),
  rowCount: z.number(),
})
const GridScrollPositionsSchema = z.record(z.string(), GridScrollPositionSchema)

export type GridScrollPosition = z.infer<typeof GridScrollPositionSchema>

type GridScrollPositions = z.infer<typeof GridScrollPositionsSchema>

// Storage is unavailable in a tab with cookies blocked, and its contents are user-editable.
// Either way the grid opens at the top rather than throwing.
function readAll(): GridScrollPositions {
  try {
    const stored = window.sessionStorage.getItem(STORAGE_KEY)
    if (stored === null) return {}
    const parsed = GridScrollPositionsSchema.safeParse(JSON.parse(stored))
    return parsed.success ? parsed.data : {}
  } catch {
    return {}
  }
}

export function readGridScrollPosition(key: string): GridScrollPosition | null {
  return readAll()[key] ?? null
}

export function writeGridScrollPosition(key: string, position: GridScrollPosition): void {
  const positions = readAll()
  // Deleting before re-inserting moves the key to the end, so the oldest entry is always the
  // first one and eviction is a slice off the front.
  delete positions[key]
  positions[key] = position
  const kept = Object.fromEntries(Object.entries(positions).slice(-MAX_ENTRIES))
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(kept))
  } catch {
    // Nothing to recover: a tab that cannot store simply does not restore.
  }
}
