import {
  ASSET_STATUS,
  DEFAULT_OUTGOING_STATUS,
  OUTGOING_STATUS,
  ROLE_PERMISSIONS,
} from 'shared-types'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import {
  ArrivalTestData,
  buildCreateDepartureInput,
  buildCreateHoldInput,
  buildCreateInvoiceInput,
  cleanupTransactionalData,
  createArrivedAssets,
  getAssetCost,
  getAssetHoldId,
  getAssetStatus,
  getHoldArchivedAt,
  assetCostOf,
  REDACTED_ASSET_COST,
  seedArrivalTestData,
  seedAssetCost,
  SEEDED_ASSET_COST,
} from '../../test/factories.js'
import { ConflictError } from '../lib/errors.js'
import { prisma } from '../prisma.js'
import {
  addAssetsToDepartureAndRecord,
  createDeparture,
  getDeparture,
  returnDepartureAssetsToStock,
  setDepartureOutgoingStatus,
} from './departureService.js'
import { createHold } from './holdService.js'
import { createInvoice } from './invoiceService.js'

const ROLES_WITH_RETURN_TO_STOCK = [
  'admin',
  'leadership',
  'general_manager',
  'inventory_manager',
] as const

async function getAssetCollectionLinks(assetId: number) {
  return prisma.asset.findUniqueOrThrow({
    where: { id: assetId },
    select: { departure_id: true, sales_invoice_id: true },
  })
}

async function getMaxHistoryId(): Promise<number> {
  const { _max } = await prisma.history.aggregate({ _max: { id: true } })
  return _max.id ?? 0
}

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
    expect(assetCostOf(asAdmin.assets[0])).toEqual(SEEDED_ASSET_COST)

    // 'sales' has view_sale_price but not view_purchase_price
    const asSales = await getDeparture(departureNumber, 'sales')
    expect(assetCostOf(asSales.assets[0])).toEqual({
      ...REDACTED_ASSET_COST,
      sale_price: SEEDED_ASSET_COST.sale_price,
    })

    // 'member' has neither price permission
    const asMember = await getDeparture(departureNumber, 'member')
    expect(assetCostOf(asMember.assets[0])).toEqual(REDACTED_ASSET_COST)
  })

  it('returns a null cost for an asset that has no Cost row', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    const departureNumber = await createDeparture(
      buildCreateDepartureInput(refs, [{ id: asset.id, outgoing_status: OUTGOING_STATUS.SOLD }]),
      refs.userId,
    )

    const departure = await getDeparture(departureNumber, 'admin')
    expect(assetCostOf(departure.assets[0])).toEqual(REDACTED_ASSET_COST)
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
  it('returns assets to stock, clearing the departure, sales invoice and sale price', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    await seedAssetCost(asset.id)
    await createInvoice(buildCreateInvoiceInput(refs, [asset], refs.invoiceTypeSaleId), refs.userId)
    const departureNumber = await createDeparture(
      buildCreateDepartureInput(refs, [{ id: asset.id, outgoing_status: OUTGOING_STATUS.SOLD }]),
      refs.userId,
    )

    await returnDepartureAssetsToStock(departureNumber, [asset.id], refs.userId)

    expect(await getAssetStatus(asset.id)).toBe(ASSET_STATUS.IN_STOCK)
    expect(await getAssetCollectionLinks(asset.id)).toEqual({
      departure_id: null,
      sales_invoice_id: null,
    })
    expect(await getAssetCost(asset.id)).toEqual({ ...SEEDED_ASSET_COST, sale_price: null })
  })

  it('leaves assets on other departures untouched when the ids do not match', async () => {
    const [onDeparture] = await createArrivedAssets(refs, 1)
    const departureNumber = await createDeparture(
      buildCreateDepartureInput(refs, [
        { id: onDeparture.id, outgoing_status: OUTGOING_STATUS.SOLD },
      ]),
      refs.userId,
    )

    const [stranger] = await createArrivedAssets(refs, 1)
    await seedAssetCost(stranger.id)
    const strangerDeparture = await createDeparture(
      buildCreateDepartureInput(refs, [
        { id: stranger.id, outgoing_status: OUTGOING_STATUS.HARVESTED },
      ]),
      refs.userId,
    )

    await expect(
      returnDepartureAssetsToStock(departureNumber, [stranger.id], refs.userId),
    ).rejects.toThrow(ConflictError)

    expect(await getAssetStatus(stranger.id)).toBe(OUTGOING_STATUS.HARVESTED)
    expect(await getAssetCost(stranger.id)).toEqual(SEEDED_ASSET_COST)
    expect(strangerDeparture).not.toBe(departureNumber)
  })

  it('leaves the departure in place when its last asset is returned', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    const departureNumber = await createDeparture(
      buildCreateDepartureInput(refs, [{ id: asset.id, outgoing_status: OUTGOING_STATUS.SOLD }]),
      refs.userId,
    )

    await returnDepartureAssetsToStock(departureNumber, [asset.id], refs.userId)

    const departure = await getDeparture(departureNumber, 'admin')
    expect(departure.assets).toHaveLength(0)
  })

  it('leaves the other assets on the same sales invoice untouched', async () => {
    const [returned, staying] = await createArrivedAssets(refs, 2)
    await seedAssetCost(returned.id)
    await seedAssetCost(staying.id)
    await createInvoice(
      buildCreateInvoiceInput(refs, [returned, staying], refs.invoiceTypeSaleId),
      refs.userId,
    )
    const departureNumber = await createDeparture(
      buildCreateDepartureInput(refs, [
        { id: returned.id, outgoing_status: OUTGOING_STATUS.SOLD },
        { id: staying.id, outgoing_status: OUTGOING_STATUS.SOLD },
      ]),
      refs.userId,
    )

    await returnDepartureAssetsToStock(departureNumber, [returned.id], refs.userId)

    const stayingLinks = await getAssetCollectionLinks(staying.id)
    expect(stayingLinks.sales_invoice_id).not.toBeNull()
    expect(stayingLinks.departure_id).not.toBeNull()
    expect(await getAssetCost(staying.id)).toEqual(SEEDED_ASSET_COST)
  })

  it('records the return against the departure, the invoice and the asset', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    await seedAssetCost(asset.id)
    await createInvoice(buildCreateInvoiceInput(refs, [asset], refs.invoiceTypeSaleId), refs.userId)
    const departureNumber = await createDeparture(
      buildCreateDepartureInput(refs, [{ id: asset.id, outgoing_status: OUTGOING_STATUS.SOLD }]),
      refs.userId,
    )
    const sinceId = await getMaxHistoryId()

    await returnDepartureAssetsToStock(departureNumber, [asset.id], refs.userId)

    const newRows = await prisma.history.findMany({ where: { id: { gt: sinceId } } })
    expect(
      newRows.some((r) => r.entity_type === 'Departure' && r.action_type === 'ASSETS_REMOVED'),
    ).toBe(true)
    expect(
      newRows.some((r) => r.entity_type === 'Invoice' && r.action_type === 'ASSETS_REMOVED'),
    ).toBe(true)

    // The sale price is a permission-gated channel and lands on its own entity type.
    const changesFor = (entityType: string) =>
      newRows
        .filter((r) => r.entity_type === entityType && r.entity_id === asset.id)
        .map(
          (r) => r.changes as { before?: Record<string, unknown>; after?: Record<string, unknown> },
        )

    const priceChange = changesFor('AssetSalePrice').find((c) => c.after?.sale_price !== undefined)
    expect(priceChange?.before?.sale_price).toBe(SEEDED_ASSET_COST.sale_price)
    expect(priceChange?.after?.sale_price).toBeNull()
    expect(changesFor('Asset').some((c) => c.after?.status === ASSET_STATUS.IN_STOCK)).toBe(true)
  })

  it('grants return_to_stock to exactly the four intended roles', () => {
    const granted = Object.entries(ROLE_PERMISSIONS)
      .filter(([, permissions]) => permissions.includes('return_to_stock'))
      .map(([role]) => role)
    expect(granted.sort()).toEqual([...ROLES_WITH_RETURN_TO_STOCK].sort())
  })
})
