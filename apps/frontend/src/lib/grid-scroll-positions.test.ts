import { afterEach, describe, expect, it, vi } from 'vitest'
import { readGridScrollPosition, writeGridScrollPosition } from './grid-scroll-positions'

const STORAGE_KEY = 'loon-grid-scroll-positions'
const MAX_ENTRIES = 30
const POSITION = { top: 4200, left: 180, rowCount: 2941 }

afterEach(() => {
  window.sessionStorage.clear()
  vi.restoreAllMocks()
})

describe('grid scroll positions', () => {
  it('reads back what it wrote', () => {
    writeGridScrollPosition('entry-1|Assets', POSITION)
    expect(readGridScrollPosition('entry-1|Assets')).toEqual(POSITION)
  })

  it('keeps regions on the same history entry apart', () => {
    writeGridScrollPosition('entry-1|Assets', POSITION)
    writeGridScrollPosition('entry-1|Parts', { top: 10, left: 0, rowCount: 12 })
    expect(readGridScrollPosition('entry-1|Assets')).toEqual(POSITION)
  })

  it('returns null for a key that was never written', () => {
    expect(readGridScrollPosition('entry-1|Assets')).toBeNull()
  })

  it('returns null when the stored value is not valid JSON', () => {
    window.sessionStorage.setItem(STORAGE_KEY, '{ not json')
    expect(readGridScrollPosition('entry-1|Assets')).toBeNull()
  })

  it('returns null when a stored entry has the wrong shape', () => {
    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ 'entry-1|Assets': { top: 'x', left: 0, rowCount: 1 } }),
    )
    expect(readGridScrollPosition('entry-1|Assets')).toBeNull()
  })

  it('evicts the oldest entry once the cap is reached', () => {
    for (let index = 0; index <= MAX_ENTRIES; index += 1) {
      writeGridScrollPosition(`entry-${index}`, { top: index, left: 0, rowCount: index })
    }
    expect(readGridScrollPosition('entry-0')).toBeNull()
    expect(readGridScrollPosition('entry-1')).toEqual({ top: 1, left: 0, rowCount: 1 })
    expect(readGridScrollPosition(`entry-${MAX_ENTRIES}`)).toEqual({
      top: MAX_ENTRIES,
      left: 0,
      rowCount: MAX_ENTRIES,
    })
  })

  it('counts a rewritten key as the most recent, not the oldest', () => {
    writeGridScrollPosition('entry-0', { top: 0, left: 0, rowCount: 0 })
    for (let index = 1; index < MAX_ENTRIES; index += 1) {
      writeGridScrollPosition(`entry-${index}`, { top: index, left: 0, rowCount: index })
    }
    writeGridScrollPosition('entry-0', POSITION)
    writeGridScrollPosition('entry-overflow', { top: 1, left: 0, rowCount: 1 })
    expect(readGridScrollPosition('entry-0')).toEqual(POSITION)
    expect(readGridScrollPosition('entry-1')).toBeNull()
  })

  it('swallows a storage write that throws', () => {
    vi.spyOn(window.Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage disabled')
    })
    expect(() => writeGridScrollPosition('entry-1|Assets', POSITION)).not.toThrow()
  })

  it('reads as empty when storage access throws', () => {
    vi.spyOn(window.Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage disabled')
    })
    expect(readGridScrollPosition('entry-1|Assets')).toBeNull()
  })
})
