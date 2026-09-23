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
  seedWarehouseTransferCost,
  SEEDED_ASSET_COST,
  seedShippingAndReceivingLocation,
} from '../../test/factories.js'
import { ConflictError, NotFoundError } from '../lib/errors.js'
import { prisma } from '../prisma.js'
import {
  createTransfer,
  deleteTransfer,
  dispatchTransfer,
  getTransfer,
  patchTransferAssets,
  patchTransferMetadata,
  patchTransferNotes,
  receiveTransfer,
} from './transferService.js'

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

async function getTransferCosts(
  transferNumber: string,
): Promise<{
  transfer_cost: number | null
  processing_cost: number | null
  other_cost: number | null
}> {
  const transfer = await prisma.transfer.findUniqueOrThrow({
    where: { transfer_number: transferNumber },
    select: { transfer_cost: true, processing_cost: true, other_cost: true },
  })
  return {
    transfer_cost: transfer.transfer_cost?.toNumber() ?? null,
    processing_cost: transfer.processing_cost?.toNumber() ?? null,
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

  it('dispatch clears each asset location and sets it in transit', async () => {
    const assets = await createArrivedAssets(refs, 2)
    const transferNumber = await createTransfer(buildCreateTransferInput(refs, assets), refs.userId)

    await dispatchTransfer(transferNumber, refs.userId, null)

    expect(await getTransferStatus(transferNumber)).toBe('IN_TRANSIT')
    for (const asset of assets) {
      const state = await getAssetTransitState(asset.id)
      expect(state.is_in_transit).toBe(true)
      expect(state.location_id).toBeNull()
    }
  })

  it('dispatch with no saved warehouse defaults leaves each asset cost unchanged', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    await seedAssetCost(asset.id)
    const transferNumber = await createTransfer(
      buildCreateTransferInput(refs, [asset]),
      refs.userId,
    )

    await dispatchTransfer(transferNumber, refs.userId, null)

    expect(await getAssetCost(asset.id)).toEqual(SEEDED_ASSET_COST)
    expect(await getTransferCosts(transferNumber)).toEqual({
      transfer_cost: 0,
      processing_cost: 0,
      other_cost: 0,
    })
  })

  it('dispatch adds the origin warehouse defaults to every asset on the transfer', async () => {
    await seedWarehouseTransferCost(refs.warehouse.id, refs.userId, {
      transfer_cost: 10,
      processing_cost: 4,
      other_cost: 1,
    })
    const assets = await createArrivedAssets(refs, 2)
    for (const asset of assets) await seedAssetCost(asset.id)
    const transferNumber = await createTransfer(buildCreateTransferInput(refs, assets), refs.userId)

    await dispatchTransfer(transferNumber, refs.userId, null)

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
      other_cost: 1,
    })
  })

  it('dispatch costs passed by the caller override the warehouse defaults', async () => {
    await seedWarehouseTransferCost(refs.warehouse.id, refs.userId, {
      transfer_cost: 10,
      processing_cost: 4,
      other_cost: 1,
    })
    const [asset] = await createArrivedAssets(refs, 1)
    await seedAssetCost(asset.id)
    const transferNumber = await createTransfer(
      buildCreateTransferInput(refs, [asset]),
      refs.userId,
    )

    await dispatchTransfer(transferNumber, refs.userId, {
      transfer_cost: 50,
      processing_cost: 0,
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
      other_cost: 2.5,
    })
  })

  it('dispatch creates a cost row for an asset that has none', async () => {
    await seedWarehouseTransferCost(refs.warehouse.id, refs.userId, {
      transfer_cost: 10,
      processing_cost: 4,
      other_cost: 1,
    })
    const [asset] = await createArrivedAssets(refs, 1)
    const transferNumber = await createTransfer(
      buildCreateTransferInput(refs, [asset]),
      refs.userId,
    )

    await dispatchTransfer(transferNumber, refs.userId, null)

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

  it('receive moves each asset to the destination shipping & receiving and completes', async () => {
    const srLocationId = await seedShippingAndReceivingLocation(refs.warehouse2.id)
    const assets = await createArrivedAssets(refs, 2)
    const transferNumber = await createTransfer(buildCreateTransferInput(refs, assets), refs.userId)

    await dispatchTransfer(transferNumber, refs.userId, null)
    await receiveTransfer(transferNumber, refs.userId)

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
    const transferNumber = await createTransfer(buildCreateTransferInput(refs, assets), refs.userId)
    await dispatchTransfer(transferNumber, refs.userId, null)
    await receiveTransfer(transferNumber, refs.userId)

    await patchTransferNotes(transferNumber, { comment: 'delivered with damage' })

    expect(await getTransferStatus(transferNumber)).toBe('COMPLETE')
    expect(await getTransferNotes(transferNumber)).toBe('delivered with damage')
  })

  it('rejects editing metadata after dispatch', async () => {
    const assets = await createArrivedAssets(refs, 1)
    const transferNumber = await createTransfer(buildCreateTransferInput(refs, assets), refs.userId)
    await dispatchTransfer(transferNumber, refs.userId, null)

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

  it('rejects dispatching a transfer that is already in transit', async () => {
    const assets = await createArrivedAssets(refs, 1)
    const transferNumber = await createTransfer(buildCreateTransferInput(refs, assets), refs.userId)
    await dispatchTransfer(transferNumber, refs.userId, null)

    await expect(dispatchTransfer(transferNumber, refs.userId, null)).rejects.toBeInstanceOf(
      ConflictError,
    )
  })

  it('rejects receiving a transfer that is not in transit', async () => {
    const assets = await createArrivedAssets(refs, 1)
    const transferNumber = await createTransfer(buildCreateTransferInput(refs, assets), refs.userId)

    await expect(receiveTransfer(transferNumber, refs.userId)).rejects.toBeInstanceOf(ConflictError)
  })

  it('rejects receiving when the destination has no shipping & receiving location', async () => {
    const assets = await createArrivedAssets(refs, 1)
    const transferNumber = await createTransfer(buildCreateTransferInput(refs, assets), refs.userId)
    await dispatchTransfer(transferNumber, refs.userId, null)

    await expect(receiveTransfer(transferNumber, refs.userId)).rejects.toBeInstanceOf(NotFoundError)
  })

  it('rejects adding an asset that is already on another open transfer', async () => {
    const assets = await createArrivedAssets(refs, 1)
    await createTransfer(buildCreateTransferInput(refs, assets), refs.userId)

    await expect(
      createTransfer(buildCreateTransferInput(refs, assets), refs.userId),
    ).rejects.toBeInstanceOf(ConflictError)
  })

  it('rejects editing assets on a transfer after dispatch', async () => {
    const assets = await createArrivedAssets(refs, 1)
    const transferNumber = await createTransfer(buildCreateTransferInput(refs, assets), refs.userId)
    await dispatchTransfer(transferNumber, refs.userId, null)

    const [added] = await createArrivedAssets(refs, 1)
    await expect(
      patchTransferAssets(
        transferNumber,
        { assetIdsToAdd: [added.id], assetIdsToRemove: [] },
        refs.userId,
      ),
    ).rejects.toBeInstanceOf(ConflictError)
  })

  it('rejects dispatching a transfer with no assets', async () => {
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

    await expect(dispatchTransfer(transferNumber, refs.userId, null)).rejects.toBeInstanceOf(
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

  it('refuses to delete a transfer that has been dispatched', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    const transferNumber = await createTransfer(
      buildCreateTransferInput(refs, [asset]),
      refs.userId,
    )
    await dispatchTransfer(transferNumber, refs.userId, null)

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
    await dispatchTransfer(transferNumber, refs.userId, null)
    await receiveTransfer(transferNumber, refs.userId)

    await expect(deleteTransfer(transferNumber, refs.userId)).rejects.toThrow(ConflictError)
  })

  it('throws when the transfer number does not exist', async () => {
    await expect(deleteTransfer('T-YYZ-9999999', refs.userId)).rejects.toThrow(NotFoundError)
  })
})
