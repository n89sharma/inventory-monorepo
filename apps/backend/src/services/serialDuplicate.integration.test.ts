import { OUTGOING_STATUS, type CreateArrival, type UpdateAsset } from 'shared-types'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import {
  ArrivalTestData,
  buildCreateArrivalInput,
  buildCreateDepartureInput,
  buildUpdateAssetSpecs,
  cleanupTransactionalData,
  seedArrivalTestData,
} from '../../test/factories.js'
import { ConflictError } from '../lib/errors.js'
import { prisma } from '../prisma.js'
import {
  createArrival,
  createSingleArrivalAsset,
  getArrival,
  getArrivalAssetForUpdate,
  updateArrivalAsset,
} from './arrivalService.js'
import { getSerialNumberMatches } from './assetReadService.js'
import { updateAssetSpecs } from './assetSpecsService.js'
import { createDeparture } from './departureService.js'

const EXISTING_SERIAL = 'DUP-SERIAL-001'
const OTHER_SERIAL = 'DUP-SERIAL-002'
const PUNCTUATED_SERIAL = 'dup serial.001'

type SerialOverride = { serialNumber: string; duplicateSerialAcknowledged?: boolean }

// buildCreateArrivalInput generates its own unique serials; these tests need to dictate them.
function arrivalWithSerials(refs: ArrivalTestData, overrides: SerialOverride[]): CreateArrival {
  const input = buildCreateArrivalInput(refs, overrides.length)
  return {
    ...input,
    assets: input.assets.map((asset, index) => ({
      ...asset,
      duplicateSerialAcknowledged: false,
      ...overrides[index],
    })) as CreateArrival['assets'],
  }
}

async function createArrivalWithSerial(
  refs: ArrivalTestData,
  serialNumber: string,
  duplicateSerialAcknowledged = false,
): Promise<{ arrivalNumber: string; assetId: number; barcode: string }> {
  const arrivalNumber = await createArrival(
    arrivalWithSerials(refs, [{ serialNumber, duplicateSerialAcknowledged }]),
    refs.userId,
  )
  const { assets } = await getArrival(arrivalNumber, 'admin')
  const asset = assets[0]!
  return { arrivalNumber, assetId: asset.id, barcode: asset.barcode }
}

async function countAssets(): Promise<number> {
  return prisma.asset.count()
}

async function readSerialNumber(assetId: number): Promise<string> {
  const asset = await prisma.asset.findUniqueOrThrow({
    where: { id: assetId },
    select: { serial_number: true },
  })
  return asset.serial_number
}

function withSerial(asset: UpdateAsset, serialNumber: string, acknowledged: boolean): UpdateAsset {
  return { ...asset, serialNumber, duplicateSerialAcknowledged: acknowledged }
}

// Only a sold holder leaves its serial reusable, so every "accepts the duplicate" case has to
// depart its first asset before the second one can claim the number.
async function createSoldAssetWithSerial(
  refs: ArrivalTestData,
  serialNumber: string,
): Promise<{ arrivalNumber: string; assetId: number; barcode: string }> {
  // Acknowledged, so a run that sells the same serial repeatedly builds a chain of sold holders.
  const created = await createArrivalWithSerial(refs, serialNumber, true)
  await createDeparture(
    buildCreateDepartureInput(refs, [
      { id: created.assetId, outgoing_status: OUTGOING_STATUS.SOLD },
    ]),
    refs.userId,
  )
  return created
}

describe('duplicate serial numbers', () => {
  let refs: ArrivalTestData

  beforeAll(async () => {
    refs = await seedArrivalTestData()
  })

  afterEach(async () => {
    await cleanupTransactionalData()
  })

  afterAll(async () => {
    await cleanupTransactionalData()
  })

  describe('scenario 1 — two assets with the same serial in one arrival', () => {
    it('rejects when neither asset acknowledges the duplicate', async () => {
      const input = arrivalWithSerials(refs, [
        { serialNumber: EXISTING_SERIAL },
        { serialNumber: EXISTING_SERIAL },
      ])

      await expect(createArrival(input, refs.userId)).rejects.toThrow(ConflictError)
    })

    it('writes no assets when the arrival is rejected', async () => {
      const before = await countAssets()
      const input = arrivalWithSerials(refs, [
        { serialNumber: EXISTING_SERIAL },
        { serialNumber: EXISTING_SERIAL },
      ])

      await expect(createArrival(input, refs.userId)).rejects.toThrow(ConflictError)

      expect(await countAssets()).toBe(before)
    })

    // Both rows are created IN_STOCK, so the pair is the forbidden case arriving before either
    // asset exists. No acknowledgment can permit it, wherever the flag is set.
    it('rejects the pair however it is acknowledged', async () => {
      const acknowledgements = [
        [false, true],
        [true, false],
        [true, true],
      ]

      for (const [first, second] of acknowledgements) {
        const input = arrivalWithSerials(refs, [
          { serialNumber: EXISTING_SERIAL, duplicateSerialAcknowledged: first },
          { serialNumber: EXISTING_SERIAL, duplicateSerialAcknowledged: second },
        ])

        await expect(createArrival(input, refs.userId)).rejects.toThrow(ConflictError)
      }
    })

    it('treats punctuation and casing as the same serial number', async () => {
      const input = arrivalWithSerials(refs, [
        { serialNumber: EXISTING_SERIAL },
        { serialNumber: PUNCTUATED_SERIAL },
      ])

      await expect(createArrival(input, refs.userId)).rejects.toThrow(ConflictError)
    })

    it('accepts distinct serial numbers with no acknowledgment', async () => {
      const input = arrivalWithSerials(refs, [
        { serialNumber: EXISTING_SERIAL },
        { serialNumber: OTHER_SERIAL },
      ])

      const arrivalNumber = await createArrival(input, refs.userId)

      const { assets } = await getArrival(arrivalNumber, 'admin')
      expect(assets).toHaveLength(2)
    })
  })

  describe('scenario 2 — asset added to an existing arrival', () => {
    it('rejects an unacknowledged serial that already exists', async () => {
      const { arrivalNumber } = await createArrivalWithSerial(refs, EXISTING_SERIAL)
      const [asset] = arrivalWithSerials(refs, [{ serialNumber: EXISTING_SERIAL }]).assets

      await expect(createSingleArrivalAsset(arrivalNumber, asset, refs.userId)).rejects.toThrow(
        ConflictError,
      )
    })

    it('adds no asset when rejected', async () => {
      const { arrivalNumber } = await createArrivalWithSerial(refs, EXISTING_SERIAL)
      const before = await countAssets()
      const [asset] = arrivalWithSerials(refs, [{ serialNumber: EXISTING_SERIAL }]).assets

      await expect(createSingleArrivalAsset(arrivalNumber, asset, refs.userId)).rejects.toThrow(
        ConflictError,
      )

      expect(await countAssets()).toBe(before)
    })

    it('accepts the duplicate of a sold asset once acknowledged', async () => {
      await createSoldAssetWithSerial(refs, EXISTING_SERIAL)
      const { arrivalNumber } = await createArrivalWithSerial(refs, OTHER_SERIAL)
      const [asset] = arrivalWithSerials(refs, [
        { serialNumber: EXISTING_SERIAL, duplicateSerialAcknowledged: true },
      ]).assets

      const created = await createSingleArrivalAsset(arrivalNumber, asset, refs.userId)

      expect(created.serial_number).toBe(EXISTING_SERIAL)
    })

    // The block is not an acknowledgment prompt: an in-stock holder refuses the write outright.
    it('rejects a duplicate of an in-stock asset even when acknowledged', async () => {
      const { arrivalNumber } = await createArrivalWithSerial(refs, EXISTING_SERIAL)
      const [asset] = arrivalWithSerials(refs, [
        { serialNumber: EXISTING_SERIAL, duplicateSerialAcknowledged: true },
      ]).assets

      await expect(createSingleArrivalAsset(arrivalNumber, asset, refs.userId)).rejects.toThrow(
        new ConflictError(
          `Serial number ${EXISTING_SERIAL} is already on asset ${(await getArrival(arrivalNumber, 'admin')).assets[0]!.barcode}, which has not been sold`,
        ),
      )
    })

    // Harvested and scrapped machines departed too, but they were never sold, so their serials
    // stay spoken for.
    it('rejects an acknowledged duplicate of a harvested asset', async () => {
      const { assetId } = await createArrivalWithSerial(refs, EXISTING_SERIAL)
      await createDeparture(
        buildCreateDepartureInput(refs, [
          { id: assetId, outgoing_status: OUTGOING_STATUS.HARVESTED },
        ]),
        refs.userId,
      )
      const { arrivalNumber } = await createArrivalWithSerial(refs, OTHER_SERIAL)
      const [asset] = arrivalWithSerials(refs, [
        { serialNumber: EXISTING_SERIAL, duplicateSerialAcknowledged: true },
      ]).assets

      await expect(createSingleArrivalAsset(arrivalNumber, asset, refs.userId)).rejects.toThrow(
        ConflictError,
      )
    })

    it('accepts a distinct serial with no acknowledgment', async () => {
      const { arrivalNumber } = await createArrivalWithSerial(refs, EXISTING_SERIAL)
      const [asset] = arrivalWithSerials(refs, [{ serialNumber: OTHER_SERIAL }]).assets

      const created = await createSingleArrivalAsset(arrivalNumber, asset, refs.userId)

      expect(created.serial_number).toBe(OTHER_SERIAL)
    })

    it('rejects an unacknowledged serial belonging to a sold asset', async () => {
      const { assetId } = await createArrivalWithSerial(refs, EXISTING_SERIAL)
      await createDeparture(
        buildCreateDepartureInput(refs, [{ id: assetId, outgoing_status: OUTGOING_STATUS.SOLD }]),
        refs.userId,
      )
      const { arrivalNumber } = await createArrivalWithSerial(refs, OTHER_SERIAL)
      const [asset] = arrivalWithSerials(refs, [{ serialNumber: EXISTING_SERIAL }]).assets

      await expect(createSingleArrivalAsset(arrivalNumber, asset, refs.userId)).rejects.toThrow(
        ConflictError,
      )
    })
  })

  describe('scenario 3 — specs edited from the asset details page', () => {
    it('rejects a serial that already exists on another asset', async () => {
      await createArrivalWithSerial(refs, EXISTING_SERIAL)
      const { barcode } = await createArrivalWithSerial(refs, OTHER_SERIAL)

      await expect(
        updateAssetSpecs(
          barcode,
          buildUpdateAssetSpecs(refs, { serial_number: EXISTING_SERIAL }),
          refs.userId,
        ),
      ).rejects.toThrow(ConflictError)
    })

    it('leaves the stored serial number unchanged when rejected', async () => {
      await createArrivalWithSerial(refs, EXISTING_SERIAL)
      const { barcode, assetId } = await createArrivalWithSerial(refs, OTHER_SERIAL)

      await expect(
        updateAssetSpecs(
          barcode,
          buildUpdateAssetSpecs(refs, { serial_number: EXISTING_SERIAL }),
          refs.userId,
        ),
      ).rejects.toThrow(ConflictError)

      expect(await readSerialNumber(assetId)).toBe(OTHER_SERIAL)
    })

    it('accepts the duplicate of a sold asset once acknowledged', async () => {
      await createSoldAssetWithSerial(refs, EXISTING_SERIAL)
      const { barcode, assetId } = await createArrivalWithSerial(refs, OTHER_SERIAL)

      await updateAssetSpecs(
        barcode,
        buildUpdateAssetSpecs(refs, {
          serial_number: EXISTING_SERIAL,
          duplicate_serial_acknowledged: true,
        }),
        refs.userId,
      )

      expect(await readSerialNumber(assetId)).toBe(EXISTING_SERIAL)
    })

    it('rejects an acknowledged duplicate of an in-stock asset', async () => {
      await createArrivalWithSerial(refs, EXISTING_SERIAL)
      const { barcode, assetId } = await createArrivalWithSerial(refs, OTHER_SERIAL)

      await expect(
        updateAssetSpecs(
          barcode,
          buildUpdateAssetSpecs(refs, {
            serial_number: EXISTING_SERIAL,
            duplicate_serial_acknowledged: true,
          }),
          refs.userId,
        ),
      ).rejects.toThrow(ConflictError)

      expect(await readSerialNumber(assetId)).toBe(OTHER_SERIAL)
    })

    // Two assets may legitimately share a serial. Editing anything else on one of them must not
    // demand a fresh acknowledgment, or the asset becomes uneditable.
    it('allows saving an unchanged serial that is already duplicated elsewhere', async () => {
      await createSoldAssetWithSerial(refs, EXISTING_SERIAL)
      const { barcode, assetId } = await createArrivalWithSerial(refs, OTHER_SERIAL)
      await updateAssetSpecs(
        barcode,
        buildUpdateAssetSpecs(refs, {
          serial_number: EXISTING_SERIAL,
          duplicate_serial_acknowledged: true,
        }),
        refs.userId,
      )

      await updateAssetSpecs(
        barcode,
        buildUpdateAssetSpecs(refs, { serial_number: EXISTING_SERIAL, meter_black: 500 }),
        refs.userId,
      )

      expect(await readSerialNumber(assetId)).toBe(EXISTING_SERIAL)
    })

    it('accepts a serial no other asset holds', async () => {
      const { barcode, assetId } = await createArrivalWithSerial(refs, OTHER_SERIAL)

      await updateAssetSpecs(
        barcode,
        buildUpdateAssetSpecs(refs, { serial_number: EXISTING_SERIAL }),
        refs.userId,
      )

      expect(await readSerialNumber(assetId)).toBe(EXISTING_SERIAL)
    })
  })

  describe('getSerialNumberMatches — the blur-time lookup', () => {
    it('returns nothing for a serial no asset holds', async () => {
      await createArrivalWithSerial(refs, OTHER_SERIAL)

      const result = await getSerialNumberMatches(EXISTING_SERIAL, '')

      expect(result).toEqual({ matches: [], totalMatchCount: 0, blockingMatchCount: 0 })
    })

    it('matches on the normalized serial, ignoring punctuation and case', async () => {
      const { barcode } = await createArrivalWithSerial(refs, EXISTING_SERIAL)

      const result = await getSerialNumberMatches(PUNCTUATED_SERIAL, '')

      expect(result.matches.map((m) => m.barcode)).toEqual([barcode])
    })

    it('caps the returned rows at three but reports the true total', async () => {
      for (let i = 0; i < 5; i += 1) {
        await createSoldAssetWithSerial(refs, EXISTING_SERIAL)
      }

      const result = await getSerialNumberMatches(EXISTING_SERIAL, '')

      expect(result.matches).toHaveLength(3)
      expect(result.totalMatchCount).toBe(5)
      expect(result.blockingMatchCount).toBe(0)
    })

    // The gate reads blockingMatchCount, not the rows, so it cannot depend on which matches
    // happened to fit inside the cap — and the blocking row is sorted in regardless.
    it('surfaces a lone blocking match among more sold ones than it can list', async () => {
      for (let i = 0; i < 4; i += 1) {
        await createSoldAssetWithSerial(refs, EXISTING_SERIAL)
      }
      const { arrivalNumber } = await createArrivalWithSerial(refs, OTHER_SERIAL)
      const [asset] = arrivalWithSerials(refs, [
        { serialNumber: EXISTING_SERIAL, duplicateSerialAcknowledged: true },
      ]).assets
      const inStock = await createSingleArrivalAsset(arrivalNumber, asset, refs.userId)

      const result = await getSerialNumberMatches(EXISTING_SERIAL, '')

      expect(result.totalMatchCount).toBe(5)
      expect(result.blockingMatchCount).toBe(1)
      expect(result.matches[0]!.barcode).toBe(inStock.barcode)
    })

    it('excludes the named barcode', async () => {
      const { barcode } = await createArrivalWithSerial(refs, EXISTING_SERIAL)

      const result = await getSerialNumberMatches(EXISTING_SERIAL, barcode)

      expect(result).toEqual({ matches: [], totalMatchCount: 0, blockingMatchCount: 0 })
    })

    it('orders an on-hand match ahead of a departed one', async () => {
      const departed = await createSoldAssetWithSerial(refs, EXISTING_SERIAL)
      const [onHandAsset] = arrivalWithSerials(refs, [
        { serialNumber: EXISTING_SERIAL, duplicateSerialAcknowledged: true },
      ]).assets
      const onHand = await createSingleArrivalAsset(
        (await createArrivalWithSerial(refs, OTHER_SERIAL)).arrivalNumber,
        onHandAsset,
        refs.userId,
      )

      const result = await getSerialNumberMatches(EXISTING_SERIAL, '')

      expect(result.matches.map((m) => m.barcode)).toEqual([onHand.barcode, departed.barcode])
      expect(result.matches[0]!.departure_number).toBeNull()
      expect(result.matches[1]!.departure_number).not.toBeNull()
    })

    // The endpoint is open to every view_asset holder, which is only safe while the payload
    // carries no cost. A column added to the query would otherwise leak silently.
    it('returns identity fields only, with no cost data', async () => {
      await createArrivalWithSerial(refs, EXISTING_SERIAL)

      const result = await getSerialNumberMatches(EXISTING_SERIAL, '')

      expect(Object.keys(result.matches[0]!).sort()).toEqual([
        'arrival_number',
        'barcode',
        'brand',
        'departed_at',
        'departure_number',
        'model',
        'serial_number',
        'status',
        'warehouse_code',
      ])
    })
  })

  describe('scenario 4 — asset edited from the arrival details page', () => {
    it('rejects a serial that already exists on another asset', async () => {
      await createArrivalWithSerial(refs, EXISTING_SERIAL)
      const { arrivalNumber, assetId } = await createArrivalWithSerial(refs, OTHER_SERIAL)
      const editable = await getArrivalAssetForUpdate(arrivalNumber, assetId)

      await expect(
        updateArrivalAsset(
          arrivalNumber,
          assetId,
          withSerial(editable, EXISTING_SERIAL, false),
          refs.userId,
        ),
      ).rejects.toThrow(ConflictError)
    })

    it('leaves the stored serial number unchanged when rejected', async () => {
      await createArrivalWithSerial(refs, EXISTING_SERIAL)
      const { arrivalNumber, assetId } = await createArrivalWithSerial(refs, OTHER_SERIAL)
      const editable = await getArrivalAssetForUpdate(arrivalNumber, assetId)

      await expect(
        updateArrivalAsset(
          arrivalNumber,
          assetId,
          withSerial(editable, EXISTING_SERIAL, false),
          refs.userId,
        ),
      ).rejects.toThrow(ConflictError)

      expect(await readSerialNumber(assetId)).toBe(OTHER_SERIAL)
    })

    it('accepts the duplicate of a sold asset once acknowledged', async () => {
      await createSoldAssetWithSerial(refs, EXISTING_SERIAL)
      const { arrivalNumber, assetId } = await createArrivalWithSerial(refs, OTHER_SERIAL)
      const editable = await getArrivalAssetForUpdate(arrivalNumber, assetId)

      await updateArrivalAsset(
        arrivalNumber,
        assetId,
        withSerial(editable, EXISTING_SERIAL, true),
        refs.userId,
      )

      expect(await readSerialNumber(assetId)).toBe(EXISTING_SERIAL)
    })

    it('rejects an acknowledged duplicate of an in-stock asset', async () => {
      await createArrivalWithSerial(refs, EXISTING_SERIAL)
      const { arrivalNumber, assetId } = await createArrivalWithSerial(refs, OTHER_SERIAL)
      const editable = await getArrivalAssetForUpdate(arrivalNumber, assetId)

      await expect(
        updateArrivalAsset(
          arrivalNumber,
          assetId,
          withSerial(editable, EXISTING_SERIAL, true),
          refs.userId,
        ),
      ).rejects.toThrow(ConflictError)

      expect(await readSerialNumber(assetId)).toBe(OTHER_SERIAL)
    })

    it('allows saving an unchanged serial that is already duplicated elsewhere', async () => {
      await createSoldAssetWithSerial(refs, EXISTING_SERIAL)
      const { arrivalNumber, assetId } = await createArrivalWithSerial(refs, OTHER_SERIAL)
      const editable = await getArrivalAssetForUpdate(arrivalNumber, assetId)
      await updateArrivalAsset(
        arrivalNumber,
        assetId,
        withSerial(editable, EXISTING_SERIAL, true),
        refs.userId,
      )

      const reloaded = await getArrivalAssetForUpdate(arrivalNumber, assetId)
      await updateArrivalAsset(
        arrivalNumber,
        assetId,
        { ...reloaded, meterBlack: 500 },
        refs.userId,
      )

      expect(await readSerialNumber(assetId)).toBe(EXISTING_SERIAL)
    })
  })
})
