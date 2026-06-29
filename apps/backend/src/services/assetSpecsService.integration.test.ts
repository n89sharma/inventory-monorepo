import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import {
  ArrivalRefs,
  buildUpdateAssetSpecs,
  cleanupTransactionalData,
  createArrivedAssets,
  seedBrand,
  seedComponent,
  seedReferenceData,
} from '../../test/factories.js'
import { NotFoundError, ValidationError } from '../lib/errors.js'
import { prisma } from '../prisma.js'
import { updateAssetSpecs } from './assetSpecsService.js'

describe('assetSpecsService', () => {
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

  it('derives meter_total as meter_black + meter_colour', async () => {
    const [asset] = await createArrivedAssets(refs, 1)

    await updateAssetSpecs(
      asset.barcode,
      buildUpdateAssetSpecs(refs, { meter_black: 100, meter_colour: 50 }),
      refs.userId,
    )

    const spec = await prisma.technicalSpecification.findUniqueOrThrow({
      where: { asset_id: asset.id },
      select: { meter_total: true },
    })
    expect(spec.meter_total).toBe(150)
  })

  it('accepts a component belonging to the asset model brand', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    const componentId = await seedComponent(refs.brandId, 'MatchingComponent')

    await updateAssetSpecs(
      asset.barcode,
      buildUpdateAssetSpecs(refs, { component_id: componentId }),
      refs.userId,
    )

    const spec = await prisma.technicalSpecification.findUniqueOrThrow({
      where: { asset_id: asset.id },
      select: { component_id: true },
    })
    expect(spec.component_id).toBe(componentId)
  })

  it('rejects a component belonging to a different brand', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    const otherBrandId = await seedBrand('Xerox')
    const componentId = await seedComponent(otherBrandId, 'WrongBrandComponent')

    await expect(
      updateAssetSpecs(
        asset.barcode,
        buildUpdateAssetSpecs(refs, { component_id: componentId }),
        refs.userId,
      ),
    ).rejects.toThrow(ValidationError)
  })

  it('rejects updating specs for an asset that does not exist', async () => {
    await expect(
      updateAssetSpecs('DOES-NOT-EXIST', buildUpdateAssetSpecs(refs), refs.userId),
    ).rejects.toThrow(NotFoundError)
  })
})
