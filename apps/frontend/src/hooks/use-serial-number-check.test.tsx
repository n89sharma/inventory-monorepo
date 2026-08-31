import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import type { SerialNumberCheckResult, SerialNumberMatch } from 'shared-types'
import { SWRConfig } from 'swr'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSerialNumberCheck, type PersistedAsset } from './use-serial-number-check'

const getSerialNumberMatches = vi.hoisted(() => vi.fn())
vi.mock('@/data/api/asset-api', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return { ...actual, getSerialNumberMatches }
})

const NO_MATCHES: SerialNumberCheckResult = {
  matches: [],
  totalMatchCount: 0,
  blockingMatchCount: 0,
}

const SERIAL = 'SN-1'
const OTHER_SERIAL = 'SN-2'
const PUNCTUATED_SERIAL = 's n.1'
const BARCODE = 'ABC123'

const MATCH: SerialNumberMatch = {
  barcode: 'DEF456',
  serial_number: SERIAL,
  brand: 'Canon',
  model: 'iR 4545',
  status: 'IN_STOCK',
  warehouse_code: 'TOR',
  arrival_number: 'A-1',
  departure_number: null,
  departed_at: null,
}

const BLOCKING_RESULT: SerialNumberCheckResult = {
  matches: [MATCH],
  totalMatchCount: 1,
  blockingMatchCount: 1,
}

const SOLD_RESULT: SerialNumberCheckResult = {
  matches: [{ ...MATCH, status: 'SOLD', departure_number: 'D-1', departed_at: new Date() }],
  totalMatchCount: 1,
  blockingMatchCount: 0,
}

// A fresh cache per hook, so a lookup counted in one test cannot satisfy the next.
const SWR_TEST_OPTIONS = {
  provider: () => new Map(),
  dedupingInterval: 0,
  shouldRetryOnError: false,
  revalidateOnFocus: false,
}

function SwrWrapper({ children }: { children: ReactNode }) {
  return <SWRConfig value={SWR_TEST_OPTIONS}>{children}</SWRConfig>
}

function renderCheck(
  serialNumber: string,
  {
    draftSerialNumbers = [],
    persistedAsset = null,
  }: { draftSerialNumbers?: string[]; persistedAsset?: PersistedAsset | null } = {},
) {
  return renderHook(
    (currSerialNumber: string) =>
      useSerialNumberCheck({
        serialNumber: currSerialNumber,
        persistedAsset,
        draftSerialNumbers,
      }),
    { initialProps: serialNumber, wrapper: SwrWrapper },
  )
}

describe('useSerialNumberCheck', () => {
  beforeEach(() => {
    getSerialNumberMatches.mockReset()
    getSerialNumberMatches.mockResolvedValue(NO_MATCHES)
  })

  it('runs no lookup while the serial number is empty', async () => {
    renderCheck('')

    await expect.poll(() => getSerialNumberMatches.mock.calls.length).toBe(0)
  })

  it('runs no lookup for a serial number that normalizes to nothing', async () => {
    renderCheck('---')

    await expect.poll(() => getSerialNumberMatches.mock.calls.length).toBe(0)
  })

  it('matches a draft serial number regardless of punctuation and case', async () => {
    const { result } = renderCheck(PUNCTUATED_SERIAL, { draftSerialNumbers: [SERIAL] })

    await waitFor(() => expect(result.current.draftMatch).toBe(true))
    expect(result.current.hasMatch).toBe(true)
    // An unsaved sibling is created IN_STOCK, so it can never be acknowledged away.
    expect(result.current.isBlocked).toBe(true)
  })

  it('reports no match for a serial number nothing else holds', async () => {
    const { result } = renderCheck(SERIAL, { draftSerialNumbers: [OTHER_SERIAL] })

    await waitFor(() => expect(getSerialNumberMatches).toHaveBeenCalled())
    expect(result.current.draftMatch).toBe(false)
    expect(result.current.hasMatch).toBe(false)
    expect(result.current.isBlocked).toBe(false)
  })

  it('blocks a serial held by an asset that was not sold on', async () => {
    getSerialNumberMatches.mockResolvedValue(BLOCKING_RESULT)
    const { result } = renderCheck(SERIAL)

    await waitFor(() => expect(result.current.hasMatch).toBe(true))
    expect(result.current.isBlocked).toBe(true)
  })

  it('permits a serial held only by a sold asset', async () => {
    getSerialNumberMatches.mockResolvedValue(SOLD_RESULT)
    const { result } = renderCheck(SERIAL)

    await waitFor(() => expect(result.current.hasMatch).toBe(true))
    expect(result.current.isBlocked).toBe(false)
  })

  // An update only has to justify a serial it actually changes — the rule the write transaction
  // applies. Without it an asset that legitimately shares a serial could never save another edit.
  it('runs no lookup while the serial matches the persisted asset', async () => {
    getSerialNumberMatches.mockResolvedValue(BLOCKING_RESULT)
    const persistedAsset = { barcode: BARCODE, serialNumber: SERIAL }
    const { result } = renderCheck(SERIAL, { persistedAsset })

    await expect.poll(() => getSerialNumberMatches.mock.calls.length).toBe(0)
    expect(result.current.isBlocked).toBe(false)
    expect(result.current.hasMatch).toBe(false)
  })

  it('checks again once the serial is edited away from the persisted one', async () => {
    getSerialNumberMatches.mockResolvedValue(BLOCKING_RESULT)
    const persistedAsset = { barcode: BARCODE, serialNumber: SERIAL }
    const { result, rerender } = renderCheck(SERIAL, { persistedAsset })

    rerender(OTHER_SERIAL)

    await waitFor(() => expect(result.current.isBlocked).toBe(true))
    expect(getSerialNumberMatches).toHaveBeenCalledWith(OTHER_SERIAL, BARCODE)
  })

  it('reports it is checking until the answer describes the current value', async () => {
    const { result, rerender } = renderCheck(SERIAL)

    await waitFor(() => expect(result.current.isChecking).toBe(false))

    rerender(OTHER_SERIAL)

    // The debounce has not elapsed: the settled value still trails the field.
    expect(result.current.isChecking).toBe(true)
    await waitFor(() => expect(result.current.isChecking).toBe(false))
  })

  // The SWR key is the normalized serial, so two spellings of one number are a single request —
  // which is also what stops a type/retype sequence resolving to a stale answer.
  it('shares one lookup between two spellings of the same serial number', async () => {
    const { rerender } = renderCheck(SERIAL)

    await waitFor(() => expect(getSerialNumberMatches).toHaveBeenCalledOnce())

    rerender(PUNCTUATED_SERIAL)

    await expect.poll(() => getSerialNumberMatches.mock.calls.length).toBe(1)
  })

  it('runs a new lookup for a different serial number', async () => {
    const { rerender } = renderCheck(SERIAL)

    await waitFor(() => expect(getSerialNumberMatches).toHaveBeenCalledOnce())

    rerender(OTHER_SERIAL)

    await waitFor(() => expect(getSerialNumberMatches).toHaveBeenCalledTimes(2))
  })
})
