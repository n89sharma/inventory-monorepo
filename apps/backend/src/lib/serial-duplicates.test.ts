import { describe, expect, it, vi } from 'vitest'
import type { Prisma } from '../../generated/prisma/client.js'
import { ConflictError } from './errors.js'
import {
  assertSerialDuplicatesAllowed,
  buildUpdateSerialCandidates,
  type SerialCandidate,
} from './serial-duplicates.js'

type PersistedAsset = {
  id: number
  barcode: string
  serial_normalized: string
  status: { status: string }
}

// Only `asset.findMany` is reached; the rest of the client is irrelevant to the algorithm.
function fakeTransaction(persisted: PersistedAsset[]) {
  const findMany = vi.fn().mockResolvedValue(persisted)
  return { tx: { asset: { findMany } } as unknown as Prisma.TransactionClient, findMany }
}

// A sold holder leaves the serial reusable; anything else blocks it outright.
function soldAsset(overrides: Partial<PersistedAsset> = {}): PersistedAsset {
  return {
    id: 7,
    barcode: 'YYZ-0000007',
    serial_normalized: 'sn1',
    status: { status: 'SOLD' },
    ...overrides,
  }
}

function inStockAsset(overrides: Partial<PersistedAsset> = {}): PersistedAsset {
  return soldAsset({ status: { status: 'IN_STOCK' }, ...overrides })
}

function candidate(overrides: Partial<SerialCandidate> = {}): SerialCandidate {
  return { serialNumber: 'SN-1', acknowledged: false, excludeAssetId: null, ...overrides }
}

describe('assertSerialDuplicatesAllowed', () => {
  it('runs no query for an empty candidate list', async () => {
    const { tx, findMany } = fakeTransaction([])

    await assertSerialDuplicatesAllowed(tx, [])

    expect(findMany).not.toHaveBeenCalled()
  })

  it('runs no query when every serial normalizes to an empty string', async () => {
    const { tx, findMany } = fakeTransaction([])

    await assertSerialDuplicatesAllowed(tx, [candidate({ serialNumber: '---' })])

    expect(findMany).not.toHaveBeenCalled()
  })

  it('passes when no candidate collides', async () => {
    const { tx } = fakeTransaction([])

    await expect(
      assertSerialDuplicatesAllowed(tx, [
        candidate({ serialNumber: 'SN-1' }),
        candidate({ serialNumber: 'SN-2' }),
        candidate({ serialNumber: 'SN-3' }),
      ]),
    ).resolves.toBeUndefined()
  })

  it('throws naming the colliding barcode when a sold asset matches', async () => {
    const { tx } = fakeTransaction([soldAsset()])

    await expect(
      assertSerialDuplicatesAllowed(tx, [candidate({ serialNumber: 'SN-1' })]),
    ).rejects.toThrow(new ConflictError('Serial number SN-1 already exists on asset YYZ-0000007'))
  })

  it('passes when the persisted match is the asset being updated', async () => {
    const { tx } = fakeTransaction([inStockAsset()])

    await expect(
      assertSerialDuplicatesAllowed(tx, [candidate({ serialNumber: 'SN-1', excludeAssetId: 7 })]),
    ).resolves.toBeUndefined()
  })

  it('passes when an acknowledged candidate collides with a sold asset', async () => {
    const { tx } = fakeTransaction([soldAsset()])

    await expect(
      assertSerialDuplicatesAllowed(tx, [candidate({ serialNumber: 'SN-1', acknowledged: true })]),
    ).resolves.toBeUndefined()
  })

  // The whole point of the block: acknowledgment is not an override.
  it.each([
    'UNKNOWN',
    'ON_ORDER',
    'IN_STOCK',
    'HELD',
    'RETURNED',
    'MISSING',
    'LEASED',
    'HARVESTED',
    'SCRAPPED',
  ])('blocks an acknowledged duplicate of a %s asset', async (status) => {
    const { tx } = fakeTransaction([soldAsset({ status: { status } })])

    await expect(
      assertSerialDuplicatesAllowed(tx, [candidate({ serialNumber: 'SN-1', acknowledged: true })]),
    ).rejects.toThrow(
      new ConflictError(
        'Serial number SN-1 is already on asset YYZ-0000007, which has not been sold',
      ),
    )
  })

  // One blocking holder is enough, whichever order the rows arrive in.
  it('blocks when a sold holder and a blocking holder share the serial', async () => {
    const { tx } = fakeTransaction([soldAsset(), inStockAsset({ id: 8, barcode: 'YYZ-0000008' })])

    await expect(
      assertSerialDuplicatesAllowed(tx, [candidate({ serialNumber: 'SN-1', acknowledged: true })]),
    ).rejects.toThrow(ConflictError)
  })

  it('throws when a later candidate repeats an earlier one', async () => {
    const { tx } = fakeTransaction([])

    await expect(
      assertSerialDuplicatesAllowed(tx, [
        candidate({ serialNumber: 'SN-1' }),
        candidate({ serialNumber: 'SN-1' }),
      ]),
    ).rejects.toThrow(ConflictError)
  })

  // Both rows of an arrival are created IN_STOCK, so an in-payload repeat is the forbidden
  // case arriving before either row exists — no acknowledgment can permit it.
  it('rejects a repeat however it is acknowledged', async () => {
    const { tx } = fakeTransaction([])

    await expect(
      assertSerialDuplicatesAllowed(tx, [
        candidate({ serialNumber: 'SN-1' }),
        candidate({ serialNumber: 'SN-1', acknowledged: true }),
      ]),
    ).rejects.toThrow(
      new ConflictError('Serial number SN-1 appears more than once in this request'),
    )

    const second = fakeTransaction([])
    await expect(
      assertSerialDuplicatesAllowed(second.tx, [
        candidate({ serialNumber: 'SN-1', acknowledged: true }),
        candidate({ serialNumber: 'SN-1', acknowledged: true }),
      ]),
    ).rejects.toThrow(ConflictError)
  })

  it('compares serials on their normalized form', async () => {
    const { tx } = fakeTransaction([])

    await expect(
      assertSerialDuplicatesAllowed(tx, [
        candidate({ serialNumber: 'SN-1' }),
        candidate({ serialNumber: 's n.1' }),
      ]),
    ).rejects.toThrow(ConflictError)
  })

  // The lookup runs before any candidate is judged, so the repeat below still rejects — the
  // assertion is about the single batched query, not the outcome.
  it('queries each distinct normalized serial once', async () => {
    const { tx, findMany } = fakeTransaction([])

    await expect(
      assertSerialDuplicatesAllowed(tx, [
        candidate({ serialNumber: 'SN-1' }),
        candidate({ serialNumber: 'sn1' }),
        candidate({ serialNumber: 'SN-2' }),
      ]),
    ).rejects.toThrow(ConflictError)

    expect(findMany).toHaveBeenCalledWith({
      where: { serial_normalized: { in: ['sn1', 'sn2'] } },
      select: {
        id: true,
        barcode: true,
        serial_normalized: true,
        status: { select: { status: true } },
      },
    })
  })
})

describe('buildUpdateSerialCandidates', () => {
  it('returns no candidate when the serial is unchanged', () => {
    expect(
      buildUpdateSerialCandidates({
        assetId: 1,
        prevSerialNumber: 'SN-1',
        newSerialNumber: 'SN-1',
        acknowledged: false,
      }),
    ).toEqual([])
  })

  it('treats a re-punctuated serial as unchanged', () => {
    expect(
      buildUpdateSerialCandidates({
        assetId: 1,
        prevSerialNumber: 'SN-1',
        newSerialNumber: 's n.1',
        acknowledged: false,
      }),
    ).toEqual([])
  })

  it('returns the candidate excluding the asset itself when the serial changes', () => {
    expect(
      buildUpdateSerialCandidates({
        assetId: 1,
        prevSerialNumber: 'SN-1',
        newSerialNumber: 'SN-2',
        acknowledged: true,
      }),
    ).toEqual([{ serialNumber: 'SN-2', acknowledged: true, excludeAssetId: 1 }])
  })
})
