import { ASSET_STATUS } from 'shared-types'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  ArrivalRefs,
  buildCreateArrivalInput,
  cleanupTransactionalData,
  seedReferenceData,
} from '../../test/factories.js'
import { prisma } from '../prisma.js'
import { createArrival } from './arrivalService.js'

describe('createArrival', () => {
  let refs: ArrivalRefs

  beforeAll(async () => {
    refs = await seedReferenceData()
  })

  afterAll(async () => {
    await cleanupTransactionalData()
  })

  it('sets every arrived asset to IN_STOCK', async () => {
    const input = buildCreateArrivalInput(refs)
    const arrivalNumber = await createArrival(input, refs.userId)

    const assets = await prisma.asset.findMany({
      where: { arrival: { arrival_number: arrivalNumber } },
      select: { status: { select: { status: true } } },
    })

    expect(assets).toHaveLength(input.assets.length)
    expect(assets.every((a) => a.status.status === ASSET_STATUS.IN_STOCK)).toBe(true)
  })

  it('numbers the arrival A-<cityCode>-<7-digit sequence>', async () => {
    const arrivalNumber = await createArrival(buildCreateArrivalInput(refs, 1), refs.userId)
    expect(arrivalNumber).toMatch(/^A-YYZ-\d{7}$/)
  })

  it('barcodes each asset <cityCode>-<7-digit sequence>', async () => {
    const arrivalNumber = await createArrival(buildCreateArrivalInput(refs, 1), refs.userId)
    const assets = await prisma.asset.findMany({
      where: { arrival: { arrival_number: arrivalNumber } },
      select: { barcode: true },
    })
    expect(assets).toHaveLength(1)
    expect(assets[0].barcode).toMatch(/^YYZ-\d{7}$/)
  })
})
