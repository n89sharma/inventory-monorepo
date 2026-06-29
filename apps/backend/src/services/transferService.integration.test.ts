import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import {
  ArrivalRefs,
  buildCreateTransferInput,
  cleanupTransactionalData,
  createArrivedAssets,
  seedReferenceData,
} from '../../test/factories.js'
import { prisma } from '../prisma.js'
import { createTransfer, patchTransferAssets } from './transferService.js'

// NOTE: transfers currently do not change asset status or set is_in_transit (audit §13.1/§13.6).
// That gap is pending a product decision, so it is intentionally NOT asserted here — these
// tests cover only the asset-linking behavior we know is correct.
describe('transferService', () => {
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
})
