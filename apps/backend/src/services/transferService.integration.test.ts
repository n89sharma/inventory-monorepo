import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import {
  ArrivalTestData,
  buildCreateTransferInput,
  cleanupTransactionalData,
  createArrivedAssets,
  assetCostOf,
  ALL_PRICE_PERMISSIONS,
  NO_PERMISSIONS,
  SALE_PRICE_ONLY,
  REDACTED_ASSET_COST,
  seedArrivalTestData,
  seedAssetCost,
  getAssetCost,
  getAssetStatus,
  seedWarehouseTransferCost,
  setAssetReadiness,
  setAssetStatus,
  SEEDED_ASSET_COST,
  seedShippingAndReceivingLocation,
} from '../../test/factories.js'
import { ASSET_STATUS, type LocationParts, type TransferCosts } from 'shared-types'
import { ConflictError, NotFoundError } from '../lib/errors.js'
import { prisma } from '../prisma.js'
import {
  completeTransfer,
  createTransfer,
  deleteTransfer,
  departTransfer,
  getTransfer,
  markAssetMissingAtLoadSer,
  markAssetMissingAtUnloadSer,
  patchTransferAssets,
  patchTransferDate,
  patchTransferMetadata,
  patchTransferNotes,
  returnTransferAssetsToOrigin,
  scanAssetLoadedSer,
  scanAssetUnloadedSer,
  scheduleTransfer,
  startLoadingTransfer,
  startUnloadingTransfer,
  undoAssetLoadSer,
  undoAssetUnloadSer,
} from './transferService.js'
import type { History } from '../../generated/prisma/client.js'

const TEST_TRANSFER_DATE = new Date().toISOString().slice(0, 10)

async function scheduleAndStartLoading(transferNumber: string, userId: number): Promise<void> {
  await scheduleTransfer(transferNumber, { transfer_date: TEST_TRANSFER_DATE }, userId)
  await startLoadingTransfer(transferNumber, userId)
}

async function loadAssets(
  transferNumber: string,
  assetIds: number[],
  userId: number,
): Promise<void> {
  for (const assetId of assetIds) {
    await scanAssetLoadedSer(transferNumber, assetId, userId)
  }
}

async function departFromDraft(
  transferNumber: string,
  assetIds: number[],
  userId: number,
  costs: TransferCosts | null,
): Promise<void> {
  await scheduleAndStartLoading(transferNumber, userId)
  await loadAssets(transferNumber, assetIds, userId)
  await departTransfer(transferNumber, userId, costs)
}

async function unloadAssets(
  transferNumber: string,
  assetIds: number[],
  userId: number,
): Promise<void> {
  for (const assetId of assetIds) {
    await scanAssetUnloadedSer(transferNumber, assetId, userId)
  }
}

async function completeFromInTransit(
  transferNumber: string,
  assetIds: number[],
  userId: number,
): Promise<void> {
  await startUnloadingTransfer(transferNumber, userId)
  await unloadAssets(transferNumber, assetIds, userId)
  await completeTransfer(transferNumber, userId)
}

// Drives a freshly created transfer to the given non-DRAFT status, for parameterized guard tests.
async function advanceToStatus(
  transferNumber: string,
  assetIds: number[],
  userId: number,
  status: string,
): Promise<void> {
  if (status === 'SCHEDULED') {
    await scheduleTransfer(transferNumber, { transfer_date: TEST_TRANSFER_DATE }, userId)
    return
  }
  if (status === 'LOADING_IN_PROGRESS') {
    await scheduleAndStartLoading(transferNumber, userId)
    return
  }
  if (status === 'IN_TRANSIT') {
    await departFromDraft(transferNumber, assetIds, userId, null)
    return
  }
  if (status === 'UNLOADING_IN_PROGRESS') {
    await departFromDraft(transferNumber, assetIds, userId, null)
    await startUnloadingTransfer(transferNumber, userId)
    return
  }
  if (status === 'COMPLETE') {
    await departFromDraft(transferNumber, assetIds, userId, null)
    await completeFromInTransit(transferNumber, assetIds, userId)
    return
  }
  throw new Error(`advanceToStatus: unsupported status ${status}`)
}

const TESTED_READINESS = 'PP_OK'

async function getTransferNotes(transferNumber: string): Promise<string | null> {
  const transfer = await prisma.transfer.findUniqueOrThrow({
    where: { transfer_number: transferNumber },
    select: { notes: true },
  })
  return transfer.notes
}

async function getTransferStatus(transferNumber: string): Promise<string> {
  const transfer = await prisma.transfer.findUniqueOrThrow({
    where: { transfer_number: transferNumber },
    select: { status: true },
  })
  return transfer.status
}

async function getTransferDate(transferNumber: string): Promise<string | null> {
  const transfer = await prisma.transfer.findUniqueOrThrow({
    where: { transfer_number: transferNumber },
    select: { transfer_date: true },
  })
  return transfer.transfer_date === null ? null : transfer.transfer_date.toISOString().slice(0, 10)
}

type TransferCostRow = Record<keyof TransferCosts, number | null>

async function getTransferCosts(transferNumber: string): Promise<TransferCostRow> {
  const transfer = await prisma.transfer.findUniqueOrThrow({
    where: { transfer_number: transferNumber },
    select: {
      transfer_cost: true,
      processing_cost: true,
      tested_processing_cost: true,
      other_cost: true,
    },
  })
  return {
    transfer_cost: transfer.transfer_cost?.toNumber() ?? null,
    processing_cost: transfer.processing_cost?.toNumber() ?? null,
    tested_processing_cost: transfer.tested_processing_cost?.toNumber() ?? null,
    other_cost: transfer.other_cost?.toNumber() ?? null,
  }
}

async function countPurchaseCostHistory(assetId: number): Promise<number> {
  return prisma.history.count({ where: { entity_type: 'AssetPurchaseCost', entity_id: assetId } })
}

async function getAssetTransitState(
  assetId: number,
): Promise<{ is_in_transit: boolean; location_id: number | null }> {
  return prisma.asset.findUniqueOrThrow({
    where: { id: assetId },
    select: { is_in_transit: true, location_id: true },
  })
}

async function getTransferAssetIds(transferNumber: string): Promise<number[]> {
  const rows = await prisma.assetTransfer.findMany({
    where: { transfer: { transfer_number: transferNumber } },
    select: { asset_id: true },
    orderBy: { asset_id: 'asc' },
  })
  return rows.map((r) => r.asset_id)
}

async function getMaxHistoryId(): Promise<number> {
  const { _max } = await prisma.history.aggregate({ _max: { id: true } })
  return _max.id ?? 0
}

type TransferMovementChanges = {
  transfer_number: string
  origin_city_code: string
  destination_city_code: string
  before: LocationParts
  after: LocationParts
}

function assetMovement(
  rows: History[],
  assetId: number,
  actionType: string,
): TransferMovementChanges | undefined {
  const row = rows.find(
    (r) => r.entity_type === 'Asset' && r.entity_id === assetId && r.action_type === actionType,
  )
  return row?.changes as TransferMovementChanges | undefined
}

function assetTransferNumberChange(
  rows: History[],
  assetId: number,
): { before: { transfer_number?: string | null }; after: { transfer_number?: string | null } } {
  const row = rows.find(
    (r) =>
      r.entity_type === 'Asset' &&
      r.entity_id === assetId &&
      r.action_type === 'UPDATE' &&
      'transfer_number' in (r.changes as { after: object }).after,
  )
  return row?.changes as {
    before: { transfer_number?: string | null }
    after: { transfer_number?: string | null }
  }
}

function hasAssetLocationEdit(rows: History[], assetId: number): boolean {
  return rows.some(
    (r) =>
      r.entity_type === 'Asset' &&
      r.entity_id === assetId &&
      r.action_type === 'UPDATE' &&
      'warehouse' in (r.changes as { after: object }).after,
  )
}

function transferStatusAfter(row: History): string | undefined {
  if (row.entity_type !== 'Transfer') return undefined
  const changes = row.changes as { after?: Record<string, unknown> }
  const status = changes.after?.status
  return typeof status === 'string' ? status : undefined
}

function transferDateAfter(row: History): string | null | undefined {
  if (row.entity_type !== 'Transfer') return undefined
  const changes = row.changes as { after?: Record<string, unknown> }
  if (!changes.after || !('transfer_date' in changes.after)) return undefined
  return changes.after.transfer_date as string | null
}

describe('transferService', () => {
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
    const transferNumber = await createTransfer(
      buildCreateTransferInput(refs, [asset]),
      refs.userId,
    )
    await seedAssetCost(asset.id)

    const asAdmin = await getTransfer(transferNumber, ALL_PRICE_PERMISSIONS)
    expect(assetCostOf(asAdmin.assets[0])).toEqual(SEEDED_ASSET_COST)

    const asSales = await getTransfer(transferNumber, SALE_PRICE_ONLY)
    expect(assetCostOf(asSales.assets[0])).toEqual({
      ...REDACTED_ASSET_COST,
      sale_price: SEEDED_ASSET_COST.sale_price,
    })

    const asMember = await getTransfer(transferNumber, NO_PERMISSIONS)
    expect(assetCostOf(asMember.assets[0])).toEqual(REDACTED_ASSET_COST)
  })

  it('returns a null cost for an asset that has no Cost row', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    const transferNumber = await createTransfer(
      buildCreateTransferInput(refs, [asset]),
      refs.userId,
    )

    const transfer = await getTransfer(transferNumber, ALL_PRICE_PERMISSIONS)
    expect(assetCostOf(transfer.assets[0])).toEqual(REDACTED_ASSET_COST)
  })

  it('links each asset to the transfer via the asset_transfers join', async () => {
    const assets = await createArrivedAssets(refs, 2)
    const transferNumber = await createTransfer(buildCreateTransferInput(refs, assets), refs.userId)

    const links = await prisma.assetTransfer.count({
      where: { transfer: { transfer_number: transferNumber } },
    })
    expect(links).toBe(assets.length)
  })

  it('adds and removes assets on an existing transfer', async () => {
    const [original] = await createArrivedAssets(refs, 1)
    const transferNumber = await createTransfer(
      buildCreateTransferInput(refs, [original]),
      refs.userId,
    )

    const [added] = await createArrivedAssets(refs, 1)
    await patchTransferAssets(
      transferNumber,
      { assetIdsToAdd: [added.id], assetIdsToRemove: [original.id] },
      refs.userId,
    )

    const linkedAssetIds = await prisma.assetTransfer.findMany({
      where: { transfer: { transfer_number: transferNumber } },
      select: { asset_id: true },
    })
    const ids = linkedAssetIds.map((r) => r.asset_id)
    expect(ids).toContain(added.id)
    expect(ids).not.toContain(original.id)
  })

  it('numbers the transfer T-<originCityCode>-<7-digit sequence>', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    const transferNumber = await createTransfer(
      buildCreateTransferInput(refs, [asset]),
      refs.userId,
    )
    expect(transferNumber).toMatch(/^T-YYZ-\d{7}$/)
  })

  it('depart clears each asset location and sets it in transit', async () => {
    const assets = await createArrivedAssets(refs, 2)
    const transferNumber = await createTransfer(buildCreateTransferInput(refs, assets), refs.userId)

    await departFromDraft(
      transferNumber,
      assets.map((a) => a.id),
      refs.userId,
      null,
    )

    expect(await getTransferStatus(transferNumber)).toBe('IN_TRANSIT')
    for (const asset of assets) {
      const state = await getAssetTransitState(asset.id)
      expect(state.is_in_transit).toBe(true)
      expect(state.location_id).toBeNull()
    }
  })

  it('depart snaps the transfer date to today when it was scheduled for the past', async () => {
    const assets = await createArrivedAssets(refs, 1)
    const assetIds = assets.map((a) => a.id)
    const transferNumber = await createTransfer(buildCreateTransferInput(refs, assets), refs.userId)
    const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    await scheduleTransfer(transferNumber, { transfer_date: TEST_TRANSFER_DATE }, refs.userId)
    await prisma.transfer.update({
      where: { transfer_number: transferNumber },
      data: { transfer_date: new Date(pastDate) },
    })
    await startLoadingTransfer(transferNumber, refs.userId)
    await loadAssets(transferNumber, assetIds, refs.userId)
    const sinceId = await getMaxHistoryId()

    await departTransfer(transferNumber, refs.userId, null)

    expect(await getTransferDate(transferNumber)).toBe(TEST_TRANSFER_DATE)
    const rows = await prisma.history.findMany({ where: { id: { gt: sinceId } } })
    expect(rows.some((r) => transferDateAfter(r) === TEST_TRANSFER_DATE)).toBe(true)
  })

  it('depart leaves the transfer date unchanged, with no date history entry, when already today', async () => {
    const assets = await createArrivedAssets(refs, 1)
    const assetIds = assets.map((a) => a.id)
    const transferNumber = await createTransfer(buildCreateTransferInput(refs, assets), refs.userId)
    await scheduleAndStartLoading(transferNumber, refs.userId)
    await loadAssets(transferNumber, assetIds, refs.userId)
    const sinceId = await getMaxHistoryId()

    await departTransfer(transferNumber, refs.userId, null)

    expect(await getTransferDate(transferNumber)).toBe(TEST_TRANSFER_DATE)
    const rows = await prisma.history.findMany({ where: { id: { gt: sinceId } } })
    expect(rows.some((r) => transferDateAfter(r) !== undefined)).toBe(false)
  })

  it('depart with no saved warehouse defaults leaves each asset cost unchanged', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    await seedAssetCost(asset.id)
    const transferNumber = await createTransfer(
      buildCreateTransferInput(refs, [asset]),
      refs.userId,
    )

    await departFromDraft(transferNumber, [asset.id], refs.userId, null)

    expect(await getAssetCost(asset.id)).toEqual(SEEDED_ASSET_COST)
    expect(await getTransferCosts(transferNumber)).toEqual({
      transfer_cost: 0,
      processing_cost: 0,
      tested_processing_cost: 0,
      other_cost: 0,
    })
  })

  it('depart adds the origin warehouse defaults to every asset on the transfer', async () => {
    await seedWarehouseTransferCost(refs.warehouse.id, refs.userId, {
      transfer_cost: 10,
      processing_cost: 4,
      tested_processing_cost: 7,
      other_cost: 1,
    })
    const assets = await createArrivedAssets(refs, 2)
    for (const asset of assets) await seedAssetCost(asset.id)
    const transferNumber = await createTransfer(buildCreateTransferInput(refs, assets), refs.userId)

    await departFromDraft(
      transferNumber,
      assets.map((a) => a.id),
      refs.userId,
      null,
    )

    for (const asset of assets) {
      expect(await getAssetCost(asset.id)).toEqual({
        ...SEEDED_ASSET_COST,
        transfer_cost: 35,
        processing_cost: 34,
        other_cost: 6,
        total_cost: 210,
      })
      expect(await countPurchaseCostHistory(asset.id)).toBe(1)
    }
    expect(await getTransferCosts(transferNumber)).toEqual({
      transfer_cost: 10,
      processing_cost: 4,
      tested_processing_cost: 7,
      other_cost: 1,
    })
  })

  it('depart costs passed by the caller override the warehouse defaults', async () => {
    await seedWarehouseTransferCost(refs.warehouse.id, refs.userId, {
      transfer_cost: 10,
      processing_cost: 4,
      tested_processing_cost: 7,
      other_cost: 1,
    })
    const [asset] = await createArrivedAssets(refs, 1)
    await seedAssetCost(asset.id)
    const transferNumber = await createTransfer(
      buildCreateTransferInput(refs, [asset]),
      refs.userId,
    )

    await departFromDraft(transferNumber, [asset.id], refs.userId, {
      transfer_cost: 50,
      processing_cost: 0,
      tested_processing_cost: 0,
      other_cost: 2.5,
    })

    expect(await getAssetCost(asset.id)).toEqual({
      ...SEEDED_ASSET_COST,
      transfer_cost: 75,
      processing_cost: 30,
      other_cost: 7.5,
      total_cost: 247.5,
    })
    expect(await getTransferCosts(transferNumber)).toEqual({
      transfer_cost: 50,
      processing_cost: 0,
      tested_processing_cost: 0,
      other_cost: 2.5,
    })
  })

  it('depart adds the tested processing cost only to machines that are not untested', async () => {
    await seedWarehouseTransferCost(refs.warehouse.id, refs.userId, {
      transfer_cost: 10,
      processing_cost: 4,
      tested_processing_cost: 7,
      other_cost: 1,
    })
    const [untested, tested] = await createArrivedAssets(refs, 2)
    await setAssetReadiness(tested.id, TESTED_READINESS)
    for (const asset of [untested, tested]) await seedAssetCost(asset.id)
    const transferNumber = await createTransfer(
      buildCreateTransferInput(refs, [untested, tested]),
      refs.userId,
    )

    await departFromDraft(transferNumber, [untested.id, tested.id], refs.userId, null)

    expect(await getAssetCost(untested.id)).toEqual({
      ...SEEDED_ASSET_COST,
      transfer_cost: 35,
      processing_cost: 34,
      other_cost: 6,
      total_cost: 210,
    })
    expect(await getAssetCost(tested.id)).toEqual({
      ...SEEDED_ASSET_COST,
      transfer_cost: 35,
      processing_cost: 41,
      other_cost: 6,
      total_cost: 217,
    })
  })

  it('depart creates a cost row for an asset that has none', async () => {
    await seedWarehouseTransferCost(refs.warehouse.id, refs.userId, {
      transfer_cost: 10,
      processing_cost: 4,
      tested_processing_cost: 7,
      other_cost: 1,
    })
    const [asset] = await createArrivedAssets(refs, 1)
    const transferNumber = await createTransfer(
      buildCreateTransferInput(refs, [asset]),
      refs.userId,
    )

    await departFromDraft(transferNumber, [asset.id], refs.userId, null)

    expect(await getAssetCost(asset.id)).toEqual({
      purchase_cost: null,
      transport_cost: null,
      transfer_cost: 10,
      processing_cost: 4,
      other_cost: 1,
      parts_cost: null,
      total_cost: 15,
      sale_price: null,
    })
  })

  it('complete moves each asset to the destination shipping & receiving', async () => {
    const srLocationId = await seedShippingAndReceivingLocation(refs.warehouse2.id)
    const assets = await createArrivedAssets(refs, 2)
    const assetIds = assets.map((a) => a.id)
    const transferNumber = await createTransfer(buildCreateTransferInput(refs, assets), refs.userId)

    await departFromDraft(transferNumber, assetIds, refs.userId, null)
    await completeFromInTransit(transferNumber, assetIds, refs.userId)

    expect(await getTransferStatus(transferNumber)).toBe('COMPLETE')
    for (const asset of assets) {
      const state = await getAssetTransitState(asset.id)
      expect(state.is_in_transit).toBe(false)
      expect(state.location_id).toBe(srLocationId)
    }
  })

  it('updates notes on a completed transfer', async () => {
    await seedShippingAndReceivingLocation(refs.warehouse2.id)
    const assets = await createArrivedAssets(refs, 1)
    const assetIds = assets.map((a) => a.id)
    const transferNumber = await createTransfer(buildCreateTransferInput(refs, assets), refs.userId)
    await departFromDraft(transferNumber, assetIds, refs.userId, null)
    await completeFromInTransit(transferNumber, assetIds, refs.userId)

    await patchTransferNotes(transferNumber, { comment: 'delivered with damage' })

    expect(await getTransferStatus(transferNumber)).toBe('COMPLETE')
    expect(await getTransferNotes(transferNumber)).toBe('delivered with damage')
  })

  it('rejects editing metadata after scheduling', async () => {
    const assets = await createArrivedAssets(refs, 1)
    const transferNumber = await createTransfer(buildCreateTransferInput(refs, assets), refs.userId)
    await scheduleTransfer(transferNumber, { transfer_date: TEST_TRANSFER_DATE }, refs.userId)

    await expect(
      patchTransferMetadata(
        transferNumber,
        {
          origin: refs.warehouse,
          destination: refs.warehouse2,
          transporter: refs.transporter,
          comment: 'too late',
        },
        refs.userId,
      ),
    ).rejects.toBeInstanceOf(ConflictError)
  })

  it('rejects departing a transfer that is not loading', async () => {
    const assets = await createArrivedAssets(refs, 1)
    const transferNumber = await createTransfer(buildCreateTransferInput(refs, assets), refs.userId)
    await departFromDraft(
      transferNumber,
      assets.map((a) => a.id),
      refs.userId,
      null,
    )

    await expect(departTransfer(transferNumber, refs.userId, null)).rejects.toBeInstanceOf(
      ConflictError,
    )
  })

  it('rejects completing a transfer that is not unloading', async () => {
    const assets = await createArrivedAssets(refs, 1)
    const transferNumber = await createTransfer(buildCreateTransferInput(refs, assets), refs.userId)

    await expect(completeTransfer(transferNumber, refs.userId)).rejects.toBeInstanceOf(
      ConflictError,
    )
  })

  it('rejects unloading when the destination has no shipping & receiving location', async () => {
    const assets = await createArrivedAssets(refs, 1)
    const transferNumber = await createTransfer(buildCreateTransferInput(refs, assets), refs.userId)
    await departFromDraft(
      transferNumber,
      assets.map((a) => a.id),
      refs.userId,
      null,
    )
    await startUnloadingTransfer(transferNumber, refs.userId)

    await expect(
      scanAssetUnloadedSer(transferNumber, assets[0].id, refs.userId),
    ).rejects.toBeInstanceOf(NotFoundError)
  })

  it('rejects adding an asset that is already on another open transfer', async () => {
    const assets = await createArrivedAssets(refs, 1)
    await createTransfer(buildCreateTransferInput(refs, assets), refs.userId)

    await expect(
      createTransfer(buildCreateTransferInput(refs, assets), refs.userId),
    ).rejects.toBeInstanceOf(ConflictError)
  })

  it('rejects editing assets on a transfer after scheduling', async () => {
    const assets = await createArrivedAssets(refs, 1)
    const transferNumber = await createTransfer(buildCreateTransferInput(refs, assets), refs.userId)
    await scheduleTransfer(transferNumber, { transfer_date: TEST_TRANSFER_DATE }, refs.userId)

    const [added] = await createArrivedAssets(refs, 1)
    await expect(
      patchTransferAssets(
        transferNumber,
        { assetIdsToAdd: [added.id], assetIdsToRemove: [] },
        refs.userId,
      ),
    ).rejects.toBeInstanceOf(ConflictError)
  })

  it('rejects scheduling a transfer with no assets', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    const transferNumber = await createTransfer(
      buildCreateTransferInput(refs, [asset]),
      refs.userId,
    )
    await patchTransferAssets(
      transferNumber,
      { assetIdsToAdd: [], assetIdsToRemove: [asset.id] },
      refs.userId,
    )

    await expect(
      scheduleTransfer(transferNumber, { transfer_date: TEST_TRANSFER_DATE }, refs.userId),
    ).rejects.toBeInstanceOf(ConflictError)
  })

  it('returns a selected asset to the origin shipping & receiving and clears in transit', async () => {
    const srLocationId = await seedShippingAndReceivingLocation(refs.warehouse.id)
    const assets = await createArrivedAssets(refs, 2)
    const transferNumber = await createTransfer(buildCreateTransferInput(refs, assets), refs.userId)
    await departFromDraft(
      transferNumber,
      assets.map((a) => a.id),
      refs.userId,
      null,
    )

    await returnTransferAssetsToOrigin(transferNumber, [assets[0].id], refs.userId)

    const state = await getAssetTransitState(assets[0].id)
    expect(state.is_in_transit).toBe(false)
    expect(state.location_id).toBe(srLocationId)
  })

  it('leaves the returned asset cost untouched', async () => {
    await seedShippingAndReceivingLocation(refs.warehouse.id)
    await seedWarehouseTransferCost(refs.warehouse.id, refs.userId, {
      transfer_cost: 10,
      processing_cost: 4,
      tested_processing_cost: 7,
      other_cost: 1,
    })
    const [asset] = await createArrivedAssets(refs, 1)
    await seedAssetCost(asset.id)
    const transferNumber = await createTransfer(
      buildCreateTransferInput(refs, [asset]),
      refs.userId,
    )
    await departFromDraft(transferNumber, [asset.id], refs.userId, null)
    const departedCost = await getAssetCost(asset.id)

    await returnTransferAssetsToOrigin(transferNumber, [asset.id], refs.userId)

    expect(await getAssetCost(asset.id)).toEqual(departedCost)
  })

  it('removes only the returned asset, leaving the rest of the transfer in transit', async () => {
    await seedShippingAndReceivingLocation(refs.warehouse.id)
    const assets = await createArrivedAssets(refs, 2)
    const transferNumber = await createTransfer(buildCreateTransferInput(refs, assets), refs.userId)
    await departFromDraft(
      transferNumber,
      assets.map((a) => a.id),
      refs.userId,
      null,
    )

    await returnTransferAssetsToOrigin(transferNumber, [assets[0].id], refs.userId)

    expect(await getTransferAssetIds(transferNumber)).toEqual([assets[1].id])
    expect(await getTransferStatus(transferNumber)).toBe('IN_TRANSIT')
    const stayed = await getAssetTransitState(assets[1].id)
    expect(stayed.is_in_transit).toBe(true)
    expect(stayed.location_id).toBeNull()
  })

  it('reverts the transfer to draft when the last asset is returned', async () => {
    await seedShippingAndReceivingLocation(refs.warehouse.id)
    const assets = await createArrivedAssets(refs, 1)
    const transferNumber = await createTransfer(buildCreateTransferInput(refs, assets), refs.userId)
    await departFromDraft(
      transferNumber,
      assets.map((a) => a.id),
      refs.userId,
      null,
    )

    await returnTransferAssetsToOrigin(transferNumber, [assets[0].id], refs.userId)

    expect(await getTransferStatus(transferNumber)).toBe('DRAFT')
    expect(await getTransferAssetIds(transferNumber)).toEqual([])
  })

  it('rejects returning assets on a transfer that is not in transit', async () => {
    await seedShippingAndReceivingLocation(refs.warehouse.id)
    const assets = await createArrivedAssets(refs, 1)
    const transferNumber = await createTransfer(buildCreateTransferInput(refs, assets), refs.userId)

    await expect(
      returnTransferAssetsToOrigin(transferNumber, [assets[0].id], refs.userId),
    ).rejects.toBeInstanceOf(ConflictError)
  })

  it('rejects returning an asset that is not on the transfer', async () => {
    await seedShippingAndReceivingLocation(refs.warehouse.id)
    const assets = await createArrivedAssets(refs, 1)
    const transferNumber = await createTransfer(buildCreateTransferInput(refs, assets), refs.userId)
    await departFromDraft(
      transferNumber,
      assets.map((a) => a.id),
      refs.userId,
      null,
    )
    const [stranger] = await createArrivedAssets(refs, 1)

    await expect(
      returnTransferAssetsToOrigin(transferNumber, [assets[0].id, stranger.id], refs.userId),
    ).rejects.toBeInstanceOf(ConflictError)

    expect(await getTransferAssetIds(transferNumber)).toEqual([assets[0].id])
    expect((await getAssetTransitState(assets[0].id)).is_in_transit).toBe(true)
    expect((await getAssetTransitState(stranger.id)).is_in_transit).toBe(false)
  })

  it('rejects returning when the origin has no shipping & receiving location', async () => {
    const assets = await createArrivedAssets(refs, 1)
    const transferNumber = await createTransfer(buildCreateTransferInput(refs, assets), refs.userId)
    await departFromDraft(
      transferNumber,
      assets.map((a) => a.id),
      refs.userId,
      null,
    )

    await expect(
      returnTransferAssetsToOrigin(transferNumber, [assets[0].id], refs.userId),
    ).rejects.toBeInstanceOf(NotFoundError)
  })

  it('records the assets removed, and the status change only on the draft revert', async () => {
    await seedShippingAndReceivingLocation(refs.warehouse.id)
    const assets = await createArrivedAssets(refs, 2)
    const transferNumber = await createTransfer(buildCreateTransferInput(refs, assets), refs.userId)
    await departFromDraft(
      transferNumber,
      assets.map((a) => a.id),
      refs.userId,
      null,
    )

    const beforeFirstReturn = await getMaxHistoryId()
    await returnTransferAssetsToOrigin(transferNumber, [assets[0].id], refs.userId)
    const firstRows = await prisma.history.findMany({ where: { id: { gt: beforeFirstReturn } } })
    expect(
      firstRows.some((r) => r.entity_type === 'Transfer' && r.action_type === 'ASSETS_REMOVED'),
    ).toBe(true)
    expect(firstRows.some((r) => transferStatusAfter(r) === 'DRAFT')).toBe(false)

    const beforeLastReturn = await getMaxHistoryId()
    await returnTransferAssetsToOrigin(transferNumber, [assets[1].id], refs.userId)
    const lastRows = await prisma.history.findMany({ where: { id: { gt: beforeLastReturn } } })
    expect(lastRows.some((r) => transferStatusAfter(r) === 'DRAFT')).toBe(true)
  })

  it('records the transfer number on each asset when creating a transfer', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    const sinceId = await getMaxHistoryId()

    const transferNumber = await createTransfer(
      buildCreateTransferInput(refs, [asset]),
      refs.userId,
    )

    const rows = await prisma.history.findMany({ where: { id: { gt: sinceId } } })
    const change = assetTransferNumberChange(rows, asset.id)
    expect(change.before.transfer_number).toBeNull()
    expect(change.after.transfer_number).toBe(transferNumber)
  })

  it('records the transfer number going to none when removing an asset from a draft', async () => {
    const assets = await createArrivedAssets(refs, 2)
    const transferNumber = await createTransfer(buildCreateTransferInput(refs, assets), refs.userId)
    const sinceId = await getMaxHistoryId()

    await patchTransferAssets(
      transferNumber,
      { assetIdsToAdd: [], assetIdsToRemove: [assets[0].id] },
      refs.userId,
    )

    const rows = await prisma.history.findMany({ where: { id: { gt: sinceId } } })
    const change = assetTransferNumberChange(rows, assets[0].id)
    expect(change.before.transfer_number).toBe(transferNumber)
    expect(change.after.transfer_number).toBeNull()
  })

  it('records a dispatch on each asset with its previous location and no new location', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    const transferNumber = await createTransfer(
      buildCreateTransferInput(refs, [asset]),
      refs.userId,
    )
    await scheduleAndStartLoading(transferNumber, refs.userId)
    await loadAssets(transferNumber, [asset.id], refs.userId)
    const sinceId = await getMaxHistoryId()

    await departTransfer(transferNumber, refs.userId, null)

    const rows = await prisma.history.findMany({ where: { id: { gt: sinceId } } })
    const movement = assetMovement(rows, asset.id, 'TRANSFER_DISPATCHED')
    expect(movement).toMatchObject({
      transfer_number: transferNumber,
      origin_city_code: refs.warehouse.city_code,
      destination_city_code: refs.warehouse2.city_code,
      after: { warehouse: null, zone: null, bin: null },
    })
    expect(movement?.before.warehouse).toBe(refs.warehouse.city_code)
  })

  it('does not record a separate location edit when dispatching', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    const transferNumber = await createTransfer(
      buildCreateTransferInput(refs, [asset]),
      refs.userId,
    )
    await scheduleAndStartLoading(transferNumber, refs.userId)
    await loadAssets(transferNumber, [asset.id], refs.userId)
    const sinceId = await getMaxHistoryId()

    await departTransfer(transferNumber, refs.userId, null)

    const rows = await prisma.history.findMany({ where: { id: { gt: sinceId } } })
    expect(hasAssetLocationEdit(rows, asset.id)).toBe(false)
  })

  it('records an unload at the destination shipping & receiving location', async () => {
    await seedShippingAndReceivingLocation(refs.warehouse2.id)
    const [asset] = await createArrivedAssets(refs, 1)
    const transferNumber = await createTransfer(
      buildCreateTransferInput(refs, [asset]),
      refs.userId,
    )
    await departFromDraft(transferNumber, [asset.id], refs.userId, null)
    await startUnloadingTransfer(transferNumber, refs.userId)
    const sinceId = await getMaxHistoryId()

    await scanAssetUnloadedSer(transferNumber, asset.id, refs.userId)

    const rows = await prisma.history.findMany({ where: { id: { gt: sinceId } } })
    const movement = assetMovement(rows, asset.id, 'TRANSFER_ASSET_UNLOADED')
    expect(movement?.transfer_number).toBe(transferNumber)
    expect(movement?.before).toEqual({ warehouse: null, zone: null, bin: null })
    expect(movement?.after.warehouse).toBe(refs.warehouse2.city_code)
    expect(movement?.after.zone).toBe('SHIPPING_AND_RECEIVING')
  })

  it('records a return at the origin shipping & receiving location', async () => {
    await seedShippingAndReceivingLocation(refs.warehouse.id)
    const [asset] = await createArrivedAssets(refs, 1)
    const transferNumber = await createTransfer(
      buildCreateTransferInput(refs, [asset]),
      refs.userId,
    )
    await departFromDraft(transferNumber, [asset.id], refs.userId, null)
    const sinceId = await getMaxHistoryId()

    await returnTransferAssetsToOrigin(transferNumber, [asset.id], refs.userId)

    const rows = await prisma.history.findMany({ where: { id: { gt: sinceId } } })
    const movement = assetMovement(rows, asset.id, 'TRANSFER_RETURNED')
    expect(movement?.transfer_number).toBe(transferNumber)
    expect(movement?.after.warehouse).toBe(refs.warehouse.city_code)
    expect(movement?.after.zone).toBe('SHIPPING_AND_RECEIVING')
  })

  it('rejects departing while an asset is neither loaded nor marked missing', async () => {
    const assets = await createArrivedAssets(refs, 2)
    const transferNumber = await createTransfer(buildCreateTransferInput(refs, assets), refs.userId)
    await scheduleAndStartLoading(transferNumber, refs.userId)
    await scanAssetLoadedSer(transferNumber, assets[0].id, refs.userId)

    await expect(departTransfer(transferNumber, refs.userId, null)).rejects.toBeInstanceOf(
      ConflictError,
    )
  })

  it('an asset marked missing at load never travels and rejoins the transfer at completion', async () => {
    await seedShippingAndReceivingLocation(refs.warehouse2.id)
    const assets = await createArrivedAssets(refs, 2)
    const transferNumber = await createTransfer(buildCreateTransferInput(refs, assets), refs.userId)
    await scheduleAndStartLoading(transferNumber, refs.userId)
    await scanAssetLoadedSer(transferNumber, assets[0].id, refs.userId)
    const missingAssetOriginalLocation = (await getAssetTransitState(assets[1].id)).location_id
    await markAssetMissingAtLoadSer(transferNumber, assets[1].id, refs.userId)

    await departTransfer(transferNumber, refs.userId, null)

    expect(await getAssetStatus(assets[1].id)).toBe(ASSET_STATUS.MISSING)
    const missingState = await getAssetTransitState(assets[1].id)
    expect(missingState.is_in_transit).toBe(false)
    expect(missingState.location_id).toBe(missingAssetOriginalLocation)

    await startUnloadingTransfer(transferNumber, refs.userId)
    await scanAssetUnloadedSer(transferNumber, assets[0].id, refs.userId)
    await completeTransfer(transferNumber, refs.userId)

    expect(await getTransferStatus(transferNumber)).toBe('COMPLETE')
    expect(await getTransferAssetIds(transferNumber)).toContain(assets[1].id)
  })

  it('rejects marking an asset missing at load once it has already been loaded', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    const transferNumber = await createTransfer(
      buildCreateTransferInput(refs, [asset]),
      refs.userId,
    )
    await scheduleAndStartLoading(transferNumber, refs.userId)
    await scanAssetLoadedSer(transferNumber, asset.id, refs.userId)

    await expect(
      markAssetMissingAtLoadSer(transferNumber, asset.id, refs.userId),
    ).rejects.toBeInstanceOf(ConflictError)
  })

  it('rejects completing while a traveled asset is neither unloaded nor marked missing', async () => {
    const assets = await createArrivedAssets(refs, 2)
    const transferNumber = await createTransfer(buildCreateTransferInput(refs, assets), refs.userId)
    await departFromDraft(
      transferNumber,
      assets.map((a) => a.id),
      refs.userId,
      null,
    )
    await seedShippingAndReceivingLocation(refs.warehouse2.id)
    await startUnloadingTransfer(transferNumber, refs.userId)
    await scanAssetUnloadedSer(transferNumber, assets[0].id, refs.userId)

    await expect(completeTransfer(transferNumber, refs.userId)).rejects.toBeInstanceOf(
      ConflictError,
    )
  })

  it('an asset marked missing at unload moves to the destination shipping & receiving zone', async () => {
    const srLocationId = await seedShippingAndReceivingLocation(refs.warehouse2.id)
    const [asset] = await createArrivedAssets(refs, 1)
    const transferNumber = await createTransfer(
      buildCreateTransferInput(refs, [asset]),
      refs.userId,
    )
    await departFromDraft(transferNumber, [asset.id], refs.userId, null)
    await startUnloadingTransfer(transferNumber, refs.userId)

    await markAssetMissingAtUnloadSer(transferNumber, asset.id, refs.userId)
    await completeTransfer(transferNumber, refs.userId)

    expect(await getAssetStatus(asset.id)).toBe(ASSET_STATUS.MISSING)
    const state = await getAssetTransitState(asset.id)
    expect(state.is_in_transit).toBe(false)
    expect(state.location_id).toBe(srLocationId)
    expect(await getTransferStatus(transferNumber)).toBe('COMPLETE')
  })

  it('rejects marking an asset missing at unload before it ever traveled', async () => {
    const assets = await createArrivedAssets(refs, 2)
    const transferNumber = await createTransfer(buildCreateTransferInput(refs, assets), refs.userId)
    await scheduleAndStartLoading(transferNumber, refs.userId)
    await scanAssetLoadedSer(transferNumber, assets[0].id, refs.userId)
    await markAssetMissingAtLoadSer(transferNumber, assets[1].id, refs.userId)
    await departTransfer(transferNumber, refs.userId, null)
    await seedShippingAndReceivingLocation(refs.warehouse2.id)
    await startUnloadingTransfer(transferNumber, refs.userId)

    await expect(
      markAssetMissingAtUnloadSer(transferNumber, assets[1].id, refs.userId),
    ).rejects.toBeInstanceOf(ConflictError)
  })

  it('rejects scheduling a transfer that has already been scheduled', async () => {
    const assets = await createArrivedAssets(refs, 1)
    const transferNumber = await createTransfer(buildCreateTransferInput(refs, assets), refs.userId)
    await scheduleTransfer(transferNumber, { transfer_date: TEST_TRANSFER_DATE }, refs.userId)

    await expect(
      scheduleTransfer(transferNumber, { transfer_date: TEST_TRANSFER_DATE }, refs.userId),
    ).rejects.toBeInstanceOf(ConflictError)
  })

  it('moves a transfer from Draft to Scheduled, sets the transfer date, and records both', async () => {
    const assets = await createArrivedAssets(refs, 1)
    const transferNumber = await createTransfer(buildCreateTransferInput(refs, assets), refs.userId)
    const sinceId = await getMaxHistoryId()

    await scheduleTransfer(transferNumber, { transfer_date: TEST_TRANSFER_DATE }, refs.userId)

    expect(await getTransferStatus(transferNumber)).toBe('SCHEDULED')
    expect(await getTransferDate(transferNumber)).toBe(TEST_TRANSFER_DATE)
    const rows = await prisma.history.findMany({ where: { id: { gt: sinceId } } })
    expect(rows.some((r) => transferStatusAfter(r) === 'SCHEDULED')).toBe(true)
    expect(rows.some((r) => transferDateAfter(r) === TEST_TRANSFER_DATE)).toBe(true)
  })

  it('patchTransferDate rejects when the transfer is not Scheduled', async () => {
    const assets = await createArrivedAssets(refs, 1)
    const transferNumber = await createTransfer(buildCreateTransferInput(refs, assets), refs.userId)

    await expect(
      patchTransferDate(transferNumber, { transfer_date: TEST_TRANSFER_DATE }, refs.userId),
    ).rejects.toBeInstanceOf(ConflictError)
  })

  it('patchTransferDate updates the date while Scheduled and records the change', async () => {
    const assets = await createArrivedAssets(refs, 1)
    const transferNumber = await createTransfer(buildCreateTransferInput(refs, assets), refs.userId)
    await scheduleTransfer(transferNumber, { transfer_date: TEST_TRANSFER_DATE }, refs.userId)
    const sinceId = await getMaxHistoryId()
    const newDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

    await patchTransferDate(transferNumber, { transfer_date: newDate }, refs.userId)

    expect(await getTransferDate(transferNumber)).toBe(newDate)
    const rows = await prisma.history.findMany({ where: { id: { gt: sinceId } } })
    expect(rows.some((r) => transferDateAfter(r) === newDate)).toBe(true)
  })

  it.each(['SCHEDULED', 'LOADING_IN_PROGRESS', 'IN_TRANSIT', 'UNLOADING_IN_PROGRESS', 'COMPLETE'])(
    'rejects editing metadata and assets once the transfer is %s',
    async (status) => {
      if (status === 'COMPLETE' || status === 'UNLOADING_IN_PROGRESS') {
        await seedShippingAndReceivingLocation(refs.warehouse2.id)
      }
      const assets = await createArrivedAssets(refs, 1)
      const assetIds = assets.map((a) => a.id)
      const transferNumber = await createTransfer(
        buildCreateTransferInput(refs, assets),
        refs.userId,
      )
      await advanceToStatus(transferNumber, assetIds, refs.userId, status)

      await expect(
        patchTransferMetadata(
          transferNumber,
          {
            origin: refs.warehouse,
            destination: refs.warehouse2,
            transporter: refs.transporter,
            comment: 'too late',
          },
          refs.userId,
        ),
      ).rejects.toBeInstanceOf(ConflictError)

      const [stranger] = await createArrivedAssets(refs, 1)
      await expect(
        patchTransferAssets(
          transferNumber,
          { assetIdsToAdd: [stranger.id], assetIdsToRemove: [] },
          refs.userId,
        ),
      ).rejects.toBeInstanceOf(ConflictError)
    },
  )

  it('rejects starting to load a transfer that is not scheduled', async () => {
    const assets = await createArrivedAssets(refs, 1)
    const transferNumber = await createTransfer(buildCreateTransferInput(refs, assets), refs.userId)

    await expect(startLoadingTransfer(transferNumber, refs.userId)).rejects.toBeInstanceOf(
      ConflictError,
    )
  })

  it('rejects scanning an asset loaded on a transfer that is not loading', async () => {
    const assets = await createArrivedAssets(refs, 1)
    const transferNumber = await createTransfer(buildCreateTransferInput(refs, assets), refs.userId)
    await scheduleTransfer(transferNumber, { transfer_date: TEST_TRANSFER_DATE }, refs.userId)

    await expect(
      scanAssetLoadedSer(transferNumber, assets[0].id, refs.userId),
    ).rejects.toBeInstanceOf(ConflictError)
  })

  it('rejects scanning an asset as loaded once it has already been marked missing', async () => {
    const assets = await createArrivedAssets(refs, 1)
    const transferNumber = await createTransfer(buildCreateTransferInput(refs, assets), refs.userId)
    await scheduleAndStartLoading(transferNumber, refs.userId)
    await markAssetMissingAtLoadSer(transferNumber, assets[0].id, refs.userId)

    await expect(
      scanAssetLoadedSer(transferNumber, assets[0].id, refs.userId),
    ).rejects.toBeInstanceOf(ConflictError)
  })

  it('records a loaded scan on the asset', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    const transferNumber = await createTransfer(
      buildCreateTransferInput(refs, [asset]),
      refs.userId,
    )
    await scheduleAndStartLoading(transferNumber, refs.userId)
    const sinceId = await getMaxHistoryId()

    await scanAssetLoadedSer(transferNumber, asset.id, refs.userId)

    const rows = await prisma.history.findMany({ where: { id: { gt: sinceId } } })
    expect(assetMovement(rows, asset.id, 'TRANSFER_ASSET_LOADED')).toMatchObject({
      transfer_number: transferNumber,
    })
  })

  it('marking an asset missing at load leaves it unloaded and untouched in place', async () => {
    const assets = await createArrivedAssets(refs, 1)
    const transferNumber = await createTransfer(buildCreateTransferInput(refs, assets), refs.userId)
    await scheduleAndStartLoading(transferNumber, refs.userId)
    const originalState = await getAssetTransitState(assets[0].id)
    const sinceId = await getMaxHistoryId()

    await markAssetMissingAtLoadSer(transferNumber, assets[0].id, refs.userId)

    expect(await getAssetStatus(assets[0].id)).toBe(ASSET_STATUS.MISSING)
    const state = await getAssetTransitState(assets[0].id)
    expect(state).toEqual(originalState)
    const rows = await prisma.history.findMany({ where: { id: { gt: sinceId } } })
    expect(assetMovement(rows, assets[0].id, 'TRANSFER_ASSET_MARKED_MISSING')).toMatchObject({
      transfer_number: transferNumber,
    })
  })

  it('depart excludes a missing-at-load asset from cost allocation', async () => {
    await seedWarehouseTransferCost(refs.warehouse.id, refs.userId, {
      transfer_cost: 10,
      processing_cost: 4,
      tested_processing_cost: 7,
      other_cost: 1,
    })
    const [traveling, missing] = await createArrivedAssets(refs, 2)
    for (const asset of [traveling, missing]) await seedAssetCost(asset.id)
    const transferNumber = await createTransfer(
      buildCreateTransferInput(refs, [traveling, missing]),
      refs.userId,
    )
    await scheduleAndStartLoading(transferNumber, refs.userId)
    await scanAssetLoadedSer(transferNumber, traveling.id, refs.userId)
    await markAssetMissingAtLoadSer(transferNumber, missing.id, refs.userId)

    await departTransfer(transferNumber, refs.userId, null)

    expect(await getAssetCost(traveling.id)).toEqual({
      ...SEEDED_ASSET_COST,
      transfer_cost: 35,
      processing_cost: 34,
      other_cost: 6,
      total_cost: 210,
    })
    expect(await getAssetCost(missing.id)).toEqual(SEEDED_ASSET_COST)
  })

  it('rejects starting to unload a transfer that is not in transit', async () => {
    const assets = await createArrivedAssets(refs, 1)
    const transferNumber = await createTransfer(buildCreateTransferInput(refs, assets), refs.userId)
    await scheduleAndStartLoading(transferNumber, refs.userId)

    await expect(startUnloadingTransfer(transferNumber, refs.userId)).rejects.toBeInstanceOf(
      ConflictError,
    )
  })

  it('rejects scanning an asset as unloaded before it ever traveled', async () => {
    const assets = await createArrivedAssets(refs, 2)
    const transferNumber = await createTransfer(buildCreateTransferInput(refs, assets), refs.userId)
    await scheduleAndStartLoading(transferNumber, refs.userId)
    await scanAssetLoadedSer(transferNumber, assets[0].id, refs.userId)
    await markAssetMissingAtLoadSer(transferNumber, assets[1].id, refs.userId)
    await departTransfer(transferNumber, refs.userId, null)
    await seedShippingAndReceivingLocation(refs.warehouse2.id)
    await startUnloadingTransfer(transferNumber, refs.userId)

    await expect(
      scanAssetUnloadedSer(transferNumber, assets[1].id, refs.userId),
    ).rejects.toBeInstanceOf(ConflictError)
  })

  it('scanning an asset as unloaded immediately moves it to the destination shipping & receiving', async () => {
    const srLocationId = await seedShippingAndReceivingLocation(refs.warehouse2.id)
    const [asset] = await createArrivedAssets(refs, 1)
    const transferNumber = await createTransfer(
      buildCreateTransferInput(refs, [asset]),
      refs.userId,
    )
    await departFromDraft(transferNumber, [asset.id], refs.userId, null)
    await startUnloadingTransfer(transferNumber, refs.userId)

    await scanAssetUnloadedSer(transferNumber, asset.id, refs.userId)

    const state = await getAssetTransitState(asset.id)
    expect(state.is_in_transit).toBe(false)
    expect(state.location_id).toBe(srLocationId)
    // Not yet Complete — the location update happens per-scan, ahead of the transfer closing.
    expect(await getTransferStatus(transferNumber)).toBe('UNLOADING_IN_PROGRESS')
  })

  it.each(['SCHEDULED', 'LOADING_IN_PROGRESS', 'UNLOADING_IN_PROGRESS', 'COMPLETE'])(
    'rejects returning assets to origin once the transfer is %s',
    async (status) => {
      await seedShippingAndReceivingLocation(refs.warehouse.id)
      if (status === 'COMPLETE' || status === 'UNLOADING_IN_PROGRESS') {
        await seedShippingAndReceivingLocation(refs.warehouse2.id)
      }
      const assets = await createArrivedAssets(refs, 1)
      const assetIds = assets.map((a) => a.id)
      const transferNumber = await createTransfer(
        buildCreateTransferInput(refs, assets),
        refs.userId,
      )
      await advanceToStatus(transferNumber, assetIds, refs.userId, status)

      await expect(
        returnTransferAssetsToOrigin(transferNumber, assetIds, refs.userId),
      ).rejects.toBeInstanceOf(ConflictError)
    },
  )

  it.each(['SCHEDULED', 'LOADING_IN_PROGRESS', 'IN_TRANSIT', 'UNLOADING_IN_PROGRESS'])(
    'rejects adding an asset already on a transfer that is %s',
    async (status) => {
      if (status === 'UNLOADING_IN_PROGRESS') {
        await seedShippingAndReceivingLocation(refs.warehouse2.id)
      }
      const assets = await createArrivedAssets(refs, 1)
      const assetIds = assets.map((a) => a.id)
      const holderTransferNumber = await createTransfer(
        buildCreateTransferInput(refs, assets),
        refs.userId,
      )
      await advanceToStatus(holderTransferNumber, assetIds, refs.userId, status)

      await expect(
        createTransfer(buildCreateTransferInput(refs, assets), refs.userId),
      ).rejects.toBeInstanceOf(ConflictError)
    },
  )

  it('allows an asset back onto a new transfer once its prior transfer is complete', async () => {
    await seedShippingAndReceivingLocation(refs.warehouse2.id)
    const assets = await createArrivedAssets(refs, 1)
    const assetIds = assets.map((a) => a.id)
    const firstTransferNumber = await createTransfer(
      buildCreateTransferInput(refs, assets),
      refs.userId,
    )
    await advanceToStatus(firstTransferNumber, assetIds, refs.userId, 'COMPLETE')

    await expect(
      createTransfer(buildCreateTransferInput(refs, assets), refs.userId),
    ).resolves.toEqual(expect.any(String))
  })

  it('rejects adding a departed (sold) asset to a new transfer', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    await setAssetStatus(asset.id, ASSET_STATUS.SOLD)

    await expect(
      createTransfer(buildCreateTransferInput(refs, [asset]), refs.userId),
    ).rejects.toBeInstanceOf(ConflictError)
  })

  it('allows a held asset onto a new transfer', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    await setAssetStatus(asset.id, ASSET_STATUS.HELD)

    await expect(
      createTransfer(buildCreateTransferInput(refs, [asset]), refs.userId),
    ).resolves.toEqual(expect.any(String))
  })

  it('rejects adding a departed asset when patching an existing transfer', async () => {
    const [original] = await createArrivedAssets(refs, 1)
    const transferNumber = await createTransfer(
      buildCreateTransferInput(refs, [original]),
      refs.userId,
    )
    const [departed] = await createArrivedAssets(refs, 1)
    await setAssetStatus(departed.id, ASSET_STATUS.SOLD)

    await expect(
      patchTransferAssets(
        transferNumber,
        { assetIdsToAdd: [departed.id], assetIdsToRemove: [] },
        refs.userId,
      ),
    ).rejects.toBeInstanceOf(ConflictError)
  })

  it('halts loading and stays Scheduled if an asset is no longer on hand', async () => {
    const assets = await createArrivedAssets(refs, 2)
    const transferNumber = await createTransfer(buildCreateTransferInput(refs, assets), refs.userId)
    await scheduleTransfer(transferNumber, { transfer_date: TEST_TRANSFER_DATE }, refs.userId)
    // Simulates the asset being picked up by another process (e.g. a departure) after scheduling.
    await setAssetStatus(assets[0].id, ASSET_STATUS.SOLD)

    await expect(startLoadingTransfer(transferNumber, refs.userId)).rejects.toBeInstanceOf(
      ConflictError,
    )
    expect(await getTransferStatus(transferNumber)).toBe('SCHEDULED')
  })

  it('undoes a load, putting the asset back in the pending pane', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    const transferNumber = await createTransfer(
      buildCreateTransferInput(refs, [asset]),
      refs.userId,
    )
    await scheduleAndStartLoading(transferNumber, refs.userId)
    await scanAssetLoadedSer(transferNumber, asset.id, refs.userId)
    const sinceId = await getMaxHistoryId()

    await undoAssetLoadSer(transferNumber, asset.id, refs.userId)

    // Depart is blocked again until the asset is re-resolved.
    await expect(departTransfer(transferNumber, refs.userId, null)).rejects.toBeInstanceOf(
      ConflictError,
    )
    const rows = await prisma.history.findMany({ where: { id: { gt: sinceId } } })
    expect(assetMovement(rows, asset.id, 'TRANSFER_ASSET_LOAD_UNDONE')).toMatchObject({
      transfer_number: transferNumber,
    })
  })

  it('rejects undoing a load that has not happened', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    const transferNumber = await createTransfer(
      buildCreateTransferInput(refs, [asset]),
      refs.userId,
    )
    await scheduleAndStartLoading(transferNumber, refs.userId)

    await expect(undoAssetLoadSer(transferNumber, asset.id, refs.userId)).rejects.toBeInstanceOf(
      ConflictError,
    )
  })

  it('rejects undoing a load on a transfer that is not loading', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    const transferNumber = await createTransfer(
      buildCreateTransferInput(refs, [asset]),
      refs.userId,
    )

    await expect(undoAssetLoadSer(transferNumber, asset.id, refs.userId)).rejects.toBeInstanceOf(
      ConflictError,
    )
  })

  it('undoes an unload, restoring in-transit state and blocking completion again', async () => {
    const srLocationId = await seedShippingAndReceivingLocation(refs.warehouse2.id)
    const [asset] = await createArrivedAssets(refs, 1)
    const transferNumber = await createTransfer(
      buildCreateTransferInput(refs, [asset]),
      refs.userId,
    )
    await departFromDraft(transferNumber, [asset.id], refs.userId, null)
    await startUnloadingTransfer(transferNumber, refs.userId)
    await scanAssetUnloadedSer(transferNumber, asset.id, refs.userId)
    expect((await getAssetTransitState(asset.id)).location_id).toBe(srLocationId)
    const sinceId = await getMaxHistoryId()

    await undoAssetUnloadSer(transferNumber, asset.id, refs.userId)

    const state = await getAssetTransitState(asset.id)
    expect(state.is_in_transit).toBe(true)
    expect(state.location_id).toBeNull()
    await expect(completeTransfer(transferNumber, refs.userId)).rejects.toBeInstanceOf(
      ConflictError,
    )
    const rows = await prisma.history.findMany({ where: { id: { gt: sinceId } } })
    expect(assetMovement(rows, asset.id, 'TRANSFER_ASSET_UNLOAD_UNDONE')).toMatchObject({
      transfer_number: transferNumber,
    })
  })

  it('rejects undoing an unload that has not happened', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    const transferNumber = await createTransfer(
      buildCreateTransferInput(refs, [asset]),
      refs.userId,
    )
    await departFromDraft(transferNumber, [asset.id], refs.userId, null)
    await startUnloadingTransfer(transferNumber, refs.userId)

    await expect(undoAssetUnloadSer(transferNumber, asset.id, refs.userId)).rejects.toBeInstanceOf(
      ConflictError,
    )
  })

  it('rejects undoing an unload on a transfer that is not unloading', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    const transferNumber = await createTransfer(
      buildCreateTransferInput(refs, [asset]),
      refs.userId,
    )

    await expect(undoAssetUnloadSer(transferNumber, asset.id, refs.userId)).rejects.toBeInstanceOf(
      ConflictError,
    )
  })
})

describe('deleteTransfer', () => {
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

  it('deletes a draft transfer that holds no assets', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    const transferNumber = await createTransfer(
      buildCreateTransferInput(refs, [asset]),
      refs.userId,
    )
    await patchTransferAssets(
      transferNumber,
      { assetIdsToAdd: [], assetIdsToRemove: [asset.id] },
      refs.userId,
    )

    await deleteTransfer(transferNumber, refs.userId)

    expect(
      await prisma.transfer.findUnique({ where: { transfer_number: transferNumber } }),
    ).toBeNull()
  })

  it('refuses to delete a draft transfer that still holds assets', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    const transferNumber = await createTransfer(
      buildCreateTransferInput(refs, [asset]),
      refs.userId,
    )

    await expect(deleteTransfer(transferNumber, refs.userId)).rejects.toThrow(
      new ConflictError(
        `Transfer ${transferNumber} cannot be deleted because it still has 1 asset`,
      ),
    )
  })

  it('refuses to delete a transfer that has been scheduled', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    const transferNumber = await createTransfer(
      buildCreateTransferInput(refs, [asset]),
      refs.userId,
    )
    await scheduleTransfer(transferNumber, { transfer_date: TEST_TRANSFER_DATE }, refs.userId)

    await expect(deleteTransfer(transferNumber, refs.userId)).rejects.toThrow(
      new ConflictError(`Transfer ${transferNumber} cannot be deleted after dispatch`),
    )
  })

  it('refuses to delete a completed transfer', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    await seedShippingAndReceivingLocation(refs.warehouse2.id)
    const transferNumber = await createTransfer(
      buildCreateTransferInput(refs, [asset]),
      refs.userId,
    )
    await departFromDraft(transferNumber, [asset.id], refs.userId, null)
    await completeFromInTransit(transferNumber, [asset.id], refs.userId)

    await expect(deleteTransfer(transferNumber, refs.userId)).rejects.toThrow(ConflictError)
  })

  it('throws when the transfer number does not exist', async () => {
    await expect(deleteTransfer('T-YYZ-9999999', refs.userId)).rejects.toThrow(NotFoundError)
  })
})
