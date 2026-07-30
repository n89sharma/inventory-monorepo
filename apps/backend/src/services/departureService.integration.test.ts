import { DEFAULT_OUTGOING_STATUS, OUTGOING_STATUS } from 'shared-types'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import {
  ArrivalTestData,
  buildCreateDepartureInput,
  buildCreateHoldInput,
  cleanupTransactionalData,
  createArrivedAssets,
  getAssetHoldId,
  getAssetStatus,
  getHoldArchivedAt,
  REDACTED_ASSET_COST,
  seedArrivalTestData,
  seedAssetCost,
  SEEDED_ASSET_COST,
} from '../../test/factories.js'
import { ConflictError } from '../lib/errors.js'
import {
  addAssetsToDepartureAndRecord,
  createDeparture,
  getDeparture,
  setDepartureOutgoingStatus,
} from './departureService.js'
import { createHold } from './holdService.js'

describe('departureService', () => {
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

  it('returns asset cost, redacted by role permissions', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    const departureNumber = await createDeparture(
      buildCreateDepartureInput(refs, [{ id: asset.id, outgoing_status: OUTGOING_STATUS.SOLD }]),
      refs.userId,
    )
    await seedAssetCost(asset.id)

    const asAdmin = await getDeparture(departureNumber, 'admin')
    expect(asAdmin.assets[0].cost).toEqual(SEEDED_ASSET_COST)

    // 'sales' has view_sale_price but not view_purchase_price
    const asSales = await getDeparture(departureNumber, 'sales')
    expect(asSales.assets[0].cost).toEqual({
      ...REDACTED_ASSET_COST,
      sale_price: SEEDED_ASSET_COST.sale_price,
    })

    // 'member' has neither price permission
    const asMember = await getDeparture(departureNumber, 'member')
    expect(asMember.assets[0].cost).toEqual(REDACTED_ASSET_COST)
  })

  it('returns a null cost for an asset that has no Cost row', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    const departureNumber = await createDeparture(
      buildCreateDepartureInput(refs, [{ id: asset.id, outgoing_status: OUTGOING_STATUS.SOLD }]),
      refs.userId,
    )

    const departure = await getDeparture(departureNumber, 'admin')
    expect(departure.assets[0].cost).toEqual(REDACTED_ASSET_COST)
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

  it('releases a held asset and archives the hold it emptied', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    const holdNumber = await createHold(buildCreateHoldInput(refs, [asset]), refs.userId)

    await createDeparture(
      buildCreateDepartureInput(refs, [
        { id: asset.id, outgoing_status: OUTGOING_STATUS.SCRAPPED },
      ]),
      refs.userId,
    )

    expect(await getAssetHoldId(asset.id)).toBeNull()
    expect(await getAssetStatus(asset.id)).toBe(OUTGOING_STATUS.SCRAPPED)
    expect(await getHoldArchivedAt(holdNumber)).not.toBeNull()
  })

  it('keeps a hold active when only some of its assets depart', async () => {
    const [departing, staying] = await createArrivedAssets(refs, 2)
    const holdNumber = await createHold(
      buildCreateHoldInput(refs, [departing, staying]),
      refs.userId,
    )

    await createDeparture(
      buildCreateDepartureInput(refs, [
        { id: departing.id, outgoing_status: OUTGOING_STATUS.SOLD },
      ]),
      refs.userId,
    )

    expect(await getAssetHoldId(departing.id)).toBeNull()
    expect(await getAssetHoldId(staying.id)).not.toBeNull()
    expect(await getHoldArchivedAt(holdNumber)).toBeNull()
  })

  it('archives every hold a single departure empties', async () => {
    const [first, second] = await createArrivedAssets(refs, 2)
    const firstHoldNumber = await createHold(buildCreateHoldInput(refs, [first]), refs.userId)
    const secondHoldNumber = await createHold(buildCreateHoldInput(refs, [second]), refs.userId)

    await createDeparture(
      buildCreateDepartureInput(refs, [
        { id: first.id, outgoing_status: OUTGOING_STATUS.SOLD },
        { id: second.id, outgoing_status: OUTGOING_STATUS.HARVESTED },
      ]),
      refs.userId,
    )

    expect(await getHoldArchivedAt(firstHoldNumber)).not.toBeNull()
    expect(await getHoldArchivedAt(secondHoldNumber)).not.toBeNull()
  })

  it('releases a held asset added to an existing departure', async () => {
    const [first] = await createArrivedAssets(refs, 1)
    const departureNumber = await createDeparture(
      buildCreateDepartureInput(refs, [{ id: first.id, outgoing_status: OUTGOING_STATUS.SOLD }]),
      refs.userId,
    )

    const [held] = await createArrivedAssets(refs, 1)
    const holdNumber = await createHold(buildCreateHoldInput(refs, [held]), refs.userId)

    await addAssetsToDepartureAndRecord(
      departureNumber,
      { assetIdsToAdd: [held.id], assetIdsToRemove: [] },
      refs.userId,
    )

    expect(await getAssetHoldId(held.id)).toBeNull()
    expect(await getAssetStatus(held.id)).toBe(DEFAULT_OUTGOING_STATUS)
    expect(await getHoldArchivedAt(holdNumber)).not.toBeNull()
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
