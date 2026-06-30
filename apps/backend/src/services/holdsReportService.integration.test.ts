import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import {
  ArrivalTestData,
  buildCreateHoldInput,
  cleanupTransactionalData,
  createArrivedAssets,
  seedArrivalTestData,
} from '../../test/factories.js'
import { archiveHold, createHold } from './holdService.js'
import { getHoldsByUserReport } from './holdsReportService.js'

describe('holdsReportService', () => {
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

  it('lists an active hold with its held asset count', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    await createHold(buildCreateHoldInput(refs, [asset]), refs.userId)

    const report = await getHoldsByUserReport()
    expect(report).toHaveLength(1)
    expect(report[0].held_asset_count).toBe(1)
  })

  it('excludes archived holds', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    const holdNumber = await createHold(buildCreateHoldInput(refs, [asset]), refs.userId)
    await archiveHold(holdNumber, refs.userId)

    const report = await getHoldsByUserReport()
    expect(report).toHaveLength(0)
  })
})
