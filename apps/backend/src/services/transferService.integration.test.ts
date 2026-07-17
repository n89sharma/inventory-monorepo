import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import {
  ArrivalTestData,
  buildCreateTransferInput,
  cleanupTransactionalData,
  createArrivedAssets,
  seedArrivalTestData,
  seedShippingAndReceivingLocation,
} from '../../test/factories.js'
import { ConflictError, NotFoundError } from '../lib/errors.js'
import { prisma } from '../prisma.js'
import {
  createTransfer,
  dispatchTransfer,
  patchTransferAssets,
  receiveTransfer,
} from './transferService.js'

async function getTransferStatus(transferNumber: string): Promise<string> {
  const transfer = await prisma.transfer.findUniqueOrThrow({
    where: { transfer_number: transferNumber },
    select: { status: true },
  })
  return transfer.status
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

    await dispatchTransfer(transferNumber, refs.userId)

    expect(await getTransferStatus(transferNumber)).toBe('IN_TRANSIT')
    for (const asset of assets) {
      const state = await getAssetTransitState(asset.id)
      expect(state.is_in_transit).toBe(true)
      expect(state.location_id).toBeNull()
    }
  })

  it('receive moves each asset to the destination shipping & receiving and completes', async () => {
    const srLocationId = await seedShippingAndReceivingLocation(refs.warehouse2.id)
    const assets = await createArrivedAssets(refs, 2)
    const transferNumber = await createTransfer(buildCreateTransferInput(refs, assets), refs.userId)

    await dispatchTransfer(transferNumber, refs.userId)
    await receiveTransfer(transferNumber, refs.userId)

    expect(await getTransferStatus(transferNumber)).toBe('COMPLETE')
    for (const asset of assets) {
      const state = await getAssetTransitState(asset.id)
      expect(state.is_in_transit).toBe(false)
      expect(state.location_id).toBe(srLocationId)
    }
  })

  it('rejects dispatching a transfer that is already in transit', async () => {
    const assets = await createArrivedAssets(refs, 1)
    const transferNumber = await createTransfer(buildCreateTransferInput(refs, assets), refs.userId)
    await dispatchTransfer(transferNumber, refs.userId)

    await expect(dispatchTransfer(transferNumber, refs.userId)).rejects.toBeInstanceOf(
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
    await dispatchTransfer(transferNumber, refs.userId)

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
    await dispatchTransfer(transferNumber, refs.userId)

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

    await expect(dispatchTransfer(transferNumber, refs.userId)).rejects.toBeInstanceOf(
      ConflictError,
    )
  })
})
