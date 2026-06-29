import { DEFAULT_OUTGOING_STATUS, OUTGOING_STATUS } from 'shared-types'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import {
  ArrivalRefs,
  buildCreateDepartureInput,
  cleanupTransactionalData,
  createArrivedAssets,
  getAssetStatus,
  seedReferenceData,
} from '../../test/factories.js'
import { ConflictError } from '../lib/errors.js'
import {
  addAssetsToDepartureAndRecord,
  createDeparture,
  setDepartureOutgoingStatus,
} from './departureService.js'

describe('departureService', () => {
  let refs: ArrivalRefs

  beforeAll(async () => {
    refs = await seedReferenceData()
  })

  afterEach(async () => {
    await cleanupTransactionalData()
  })

  afterAll(async () => {
    await cleanupTransactionalData()
  })

  it('applies each asset its own outgoing status on creation', async () => {
    const [sold, harvested] = await createArrivedAssets(refs, 2)
    await createDeparture(
      buildCreateDepartureInput(refs, [
        { id: sold.id, outgoing_status: OUTGOING_STATUS.SOLD },
        { id: harvested.id, outgoing_status: OUTGOING_STATUS.HARVESTED },
      ]),
      refs.userId,
    )

    expect(await getAssetStatus(sold.id)).toBe(OUTGOING_STATUS.SOLD)
    expect(await getAssetStatus(harvested.id)).toBe(OUTGOING_STATUS.HARVESTED)
  })

  it('applies the default outgoing status when adding to an existing departure', async () => {
    const [first] = await createArrivedAssets(refs, 1)
    const departureNumber = await createDeparture(
      buildCreateDepartureInput(refs, [
        { id: first.id, outgoing_status: OUTGOING_STATUS.HARVESTED },
      ]),
      refs.userId,
    )

    const [added] = await createArrivedAssets(refs, 1)
    await addAssetsToDepartureAndRecord(
      departureNumber,
      { assetIdsToAdd: [added.id], assetIdsToRemove: [] },
      refs.userId,
    )

    expect(await getAssetStatus(added.id)).toBe(DEFAULT_OUTGOING_STATUS)
  })

  it('rejects removing assets from a departure', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    const departureNumber = await createDeparture(
      buildCreateDepartureInput(refs, [{ id: asset.id, outgoing_status: OUTGOING_STATUS.SOLD }]),
      refs.userId,
    )

    await expect(
      addAssetsToDepartureAndRecord(
        departureNumber,
        { assetIdsToAdd: [], assetIdsToRemove: [asset.id] },
        refs.userId,
      ),
    ).rejects.toThrow(ConflictError)
  })

  it('rejects assigning an asset that already belongs to another departure', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    await createDeparture(
      buildCreateDepartureInput(refs, [{ id: asset.id, outgoing_status: OUTGOING_STATUS.SOLD }]),
      refs.userId,
    )

    await expect(
      createDeparture(
        buildCreateDepartureInput(refs, [{ id: asset.id, outgoing_status: OUTGOING_STATUS.SOLD }]),
        refs.userId,
      ),
    ).rejects.toThrow(ConflictError)
  })

  it('rejects setting outgoing status on an asset not in the departure', async () => {
    const [onDeparture] = await createArrivedAssets(refs, 1)
    const departureNumber = await createDeparture(
      buildCreateDepartureInput(refs, [
        { id: onDeparture.id, outgoing_status: OUTGOING_STATUS.SOLD },
      ]),
      refs.userId,
    )

    const [stranger] = await createArrivedAssets(refs, 1)
    await expect(
      setDepartureOutgoingStatus(
        departureNumber,
        [stranger.id],
        OUTGOING_STATUS.SCRAPPED,
        refs.userId,
      ),
    ).rejects.toThrow(ConflictError)
  })

  it('numbers the departure D-<cityCode>-<7-digit sequence>', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    const departureNumber = await createDeparture(
      buildCreateDepartureInput(refs, [{ id: asset.id, outgoing_status: OUTGOING_STATUS.SOLD }]),
      refs.userId,
    )
    expect(departureNumber).toMatch(/^D-YYZ-\d{7}$/)
  })
})
