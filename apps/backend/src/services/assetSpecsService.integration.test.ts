import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import {
  ArrivalTestData,
  buildUpdateAssetSpecs,
  cleanupTransactionalData,
  createArrivedAssets,
  seedAccessory,
  seedArrivalTestData,
  seedBrand,
  seedComponent,
  seedError,
  seedModel,
} from '../../test/factories.js'
import { NotFoundError, ValidationError } from '../lib/errors.js'
import { prisma } from '../prisma.js'
import { updateAssetErrors } from './assetErrorService.js'
import { getAccessories } from './assetReadService.js'
import { updateAssetSpecs } from './assetSpecsService.js'

const MISSING_MODEL_ID = 999999

type HistoryChange = { before?: Record<string, unknown>; after?: Record<string, unknown> }

async function getMaxHistoryId(): Promise<number> {
  const { _max } = await prisma.history.aggregate({ _max: { id: true } })
  return _max.id ?? 0
}

async function assetUpdateChangesSince(sinceId: number, assetId: number): Promise<HistoryChange[]> {
  const rows = await prisma.history.findMany({
    where: { id: { gt: sinceId }, entity_type: 'Asset', entity_id: assetId, action_type: 'UPDATE' },
  })
  return rows.map((r) => r.changes as HistoryChange)
}

async function readinessId(status: string): Promise<number> {
  const readiness = await prisma.readiness.findUniqueOrThrow({ where: { status } })
  return readiness.id
}

describe('assetSpecsService', () => {
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

  it('derives meter_total as meter_black + meter_colour', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    const colourModelId = await seedModel(refs.brandId, 'IRADXC3835i', true)

    await updateAssetSpecs(
      asset.barcode,
      buildUpdateAssetSpecs(refs, { model_id: colourModelId, meter_black: 100, meter_colour: 50 }),
      refs.userId,
    )

    const spec = await prisma.technicalSpecification.findUniqueOrThrow({
      where: { asset_id: asset.id },
      select: { meter_total: true },
    })
    expect(spec.meter_total).toBe(150)
  })

  it('drops the colour channels when the asset moves to a mono model', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    const colourModelId = await seedModel(refs.brandId, 'IRADXC3835i', true)
    const monoModelId = await seedModel(refs.brandId, 'IRADX4751i', false)
    const colourSpecs = {
      meter_black: 100,
      meter_colour: 50,
      drum_life_c: 40,
      drum_life_m: 41,
      drum_life_y: 42,
      drum_life_k: 43,
      toner_life_c: 30,
      toner_life_m: 31,
      toner_life_y: 32,
      toner_life_k: 33,
    }
    await updateAssetSpecs(
      asset.barcode,
      buildUpdateAssetSpecs(refs, { model_id: colourModelId, ...colourSpecs }),
      refs.userId,
    )
    const sinceId = await getMaxHistoryId()

    await updateAssetSpecs(
      asset.barcode,
      buildUpdateAssetSpecs(refs, { model_id: monoModelId, ...colourSpecs }),
      refs.userId,
    )

    const spec = await prisma.technicalSpecification.findUniqueOrThrow({
      where: { asset_id: asset.id },
    })
    expect(spec).toMatchObject({
      meter_colour: null,
      drum_life_c: null,
      drum_life_m: null,
      drum_life_y: null,
      toner_life_c: null,
      toner_life_m: null,
      toner_life_y: null,
      meter_black: 100,
      meter_total: 100,
      drum_life_k: 43,
      toner_life_k: 33,
    })

    const changes = await assetUpdateChangesSince(sinceId, asset.id)
    expect(changes.some((c) => c.after?.drum_life_c === null)).toBe(true)
    expect(changes.some((c) => c.after?.drum_life_c === 40)).toBe(false)
  })

  it('keeps the colour values on a same-brand colour-to-colour model change', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    const colourModelId = await seedModel(refs.brandId, 'IRADXC3835i', true)
    const secondColourModelId = await seedModel(refs.brandId, 'IRADXC3830i', true)
    const componentId = await seedComponent(refs.brandId, 'MatchingComponent')
    const ppOkReadinessId = await readinessId('PP_OK')
    const colourSpecs = {
      component_id: componentId,
      readiness_id: ppOkReadinessId,
      meter_black: 100,
      meter_colour: 50,
      drum_life_c: 40,
      drum_life_m: 41,
      drum_life_y: 42,
      drum_life_k: 43,
      toner_life_c: 30,
      toner_life_m: 31,
      toner_life_y: 32,
      toner_life_k: 33,
    }
    await updateAssetSpecs(
      asset.barcode,
      buildUpdateAssetSpecs(refs, { model_id: colourModelId, ...colourSpecs }),
      refs.userId,
    )

    await updateAssetSpecs(
      asset.barcode,
      buildUpdateAssetSpecs(refs, { model_id: secondColourModelId, ...colourSpecs }),
      refs.userId,
    )

    const saved = await prisma.asset.findUniqueOrThrow({
      where: { id: asset.id },
      select: { model_id: true, readiness_id: true },
    })
    expect(saved.model_id).toBe(secondColourModelId)
    expect(saved.readiness_id).toBe(ppOkReadinessId)

    const spec = await prisma.technicalSpecification.findUniqueOrThrow({
      where: { asset_id: asset.id },
    })
    expect(spec).toMatchObject({
      component_id: componentId,
      meter_colour: 50,
      meter_total: 150,
      drum_life_c: 40,
      drum_life_m: 41,
      drum_life_y: 42,
      drum_life_k: 43,
      toner_life_c: 30,
      toner_life_m: 31,
      toner_life_y: 32,
      toner_life_k: 33,
    })
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

  it('persists accessories by id and reads them back', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    const tonerId = await seedAccessory('TestToner')
    const drumId = await seedAccessory('TestDrum')

    await updateAssetSpecs(
      asset.barcode,
      buildUpdateAssetSpecs(refs, { accessory_ids: [tonerId, drumId] }),
      refs.userId,
    )

    const accessories = await getAccessories(asset.barcode)
    expect(accessories.map((a) => a.id).sort()).toEqual([tonerId, drumId].sort())
  })

  it('rejects an accessory id that does not exist', async () => {
    const [asset] = await createArrivedAssets(refs, 1)

    await expect(
      updateAssetSpecs(
        asset.barcode,
        buildUpdateAssetSpecs(refs, { accessory_ids: [999999] }),
        refs.userId,
      ),
    ).rejects.toThrow(ValidationError)
  })

  it('rejects updating specs for an asset that does not exist', async () => {
    await expect(
      updateAssetSpecs('DOES-NOT-EXIST', buildUpdateAssetSpecs(refs), refs.userId),
    ).rejects.toThrow(NotFoundError)
  })

  it('rejects a model id that does not exist', async () => {
    const [asset] = await createArrivedAssets(refs, 1)

    await expect(
      updateAssetSpecs(
        asset.barcode,
        buildUpdateAssetSpecs(refs, { model_id: MISSING_MODEL_ID }),
        refs.userId,
      ),
    ).rejects.toThrow(NotFoundError)
  })

  it('persists a same-brand model change and a new serial number, and records both', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    const sameBrandModelId = await seedModel(refs.brandId, 'IRADX4751i', false)
    const sinceId = await getMaxHistoryId()

    await updateAssetSpecs(
      asset.barcode,
      buildUpdateAssetSpecs(refs, { model_id: sameBrandModelId, serial_number: 'SN-CORRECTED' }),
      refs.userId,
    )

    const saved = await prisma.asset.findUniqueOrThrow({
      where: { id: asset.id },
      select: { model_id: true, serial_number: true },
    })
    expect(saved.model_id).toBe(sameBrandModelId)
    expect(saved.serial_number).toBe('SN-CORRECTED')

    const changes = await assetUpdateChangesSince(sinceId, asset.id)
    expect(changes.some((c) => c.after?.model_name === 'IRADX4751i')).toBe(true)
    expect(changes.some((c) => c.after?.serial_number === 'SN-CORRECTED')).toBe(true)
  })

  it('clears every asset error when the model moves to another brand', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    const errorId = await seedError(refs.brandId, 'E100')
    await updateAssetErrors(
      asset.barcode,
      { errors: [{ error_id: errorId, is_fixed: false }] },
      refs.userId,
    )
    const otherBrandId = await seedBrand('Ricoh')
    const otherBrandModelId = await seedModel(otherBrandId, 'MP-C3004', false)
    const sinceId = await getMaxHistoryId()

    await updateAssetSpecs(
      asset.barcode,
      buildUpdateAssetSpecs(refs, {
        model_id: otherBrandModelId,
        readiness_id: await readinessId('PP_OK'),
      }),
      refs.userId,
    )

    const remaining = await prisma.assetError.findMany({ where: { asset_id: asset.id } })
    expect(remaining).toHaveLength(0)

    const changes = await assetUpdateChangesSince(sinceId, asset.id)
    const errorChange = changes.find((c) => c.after?.error_codes !== undefined)
    expect(errorChange?.before?.error_codes).toEqual(['E100'])
    expect(errorChange?.after?.error_codes).toEqual([])
  })

  it('releases Has Errors to Untested when the model moves to another brand', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    const errorId = await seedError(refs.brandId, 'E100')
    await updateAssetErrors(
      asset.barcode,
      { errors: [{ error_id: errorId, is_fixed: false }] },
      refs.userId,
    )
    const otherBrandId = await seedBrand('Ricoh')
    const otherBrandModelId = await seedModel(otherBrandId, 'MP-C3004', false)
    const sinceId = await getMaxHistoryId()

    await updateAssetSpecs(
      asset.barcode,
      buildUpdateAssetSpecs(refs, {
        model_id: otherBrandModelId,
        readiness_id: await readinessId('HAS_ERRORS'),
      }),
      refs.userId,
    )

    const saved = await prisma.asset.findUniqueOrThrow({
      where: { id: asset.id },
      select: { readiness: { select: { status: true } } },
    })
    expect(saved.readiness.status).toBe('UNTESTED')

    const remaining = await prisma.assetError.findMany({ where: { asset_id: asset.id } })
    expect(remaining).toHaveLength(0)

    const changes = await assetUpdateChangesSince(sinceId, asset.id)
    expect(changes.some((c) => c.after?.readiness === 'UNTESTED')).toBe(true)
  })

  it('keeps readiness locked on a same-brand change while an error is open', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    const errorId = await seedError(refs.brandId, 'E100')
    await updateAssetErrors(
      asset.barcode,
      { errors: [{ error_id: errorId, is_fixed: false }] },
      refs.userId,
    )

    await expect(
      updateAssetSpecs(
        asset.barcode,
        buildUpdateAssetSpecs(refs, { readiness_id: await readinessId('PP_OK') }),
        refs.userId,
      ),
    ).rejects.toThrow(ValidationError)
  })

  it('records damage and clears the note once the damage is unticked', async () => {
    const [asset] = await createArrivedAssets(refs, 1)

    await updateAssetSpecs(
      asset.barcode,
      buildUpdateAssetSpecs(refs, { is_damaged: true, damage_notes: 'Dented side panel' }),
      refs.userId,
    )
    await expect(
      prisma.asset.findUniqueOrThrow({
        where: { barcode: asset.barcode },
        select: { is_damaged: true, damage_notes: true },
      }),
    ).resolves.toEqual({ is_damaged: true, damage_notes: 'Dented side panel' })

    const sinceId = await getMaxHistoryId()
    await updateAssetSpecs(
      asset.barcode,
      buildUpdateAssetSpecs(refs, { is_damaged: false, damage_notes: 'Dented side panel' }),
      refs.userId,
    )
    await expect(
      prisma.asset.findUniqueOrThrow({
        where: { barcode: asset.barcode },
        select: { is_damaged: true, damage_notes: true },
      }),
    ).resolves.toEqual({ is_damaged: false, damage_notes: null })

    const [change] = await assetUpdateChangesSince(sinceId, asset.id)
    expect(change?.before).toMatchObject({ is_damaged: true, damage_notes: 'Dented side panel' })
    expect(change?.after).toMatchObject({ is_damaged: false, damage_notes: null })
  })

  it('validates the component against the new model brand, not the old one', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    const componentId = await seedComponent(refs.brandId, 'OldBrandComponent')
    const otherBrandId = await seedBrand('Ricoh')
    const otherBrandModelId = await seedModel(otherBrandId, 'MP-C3004', false)

    await expect(
      updateAssetSpecs(
        asset.barcode,
        buildUpdateAssetSpecs(refs, {
          model_id: otherBrandModelId,
          component_id: componentId,
          readiness_id: await readinessId('PP_OK'),
        }),
        refs.userId,
      ),
    ).rejects.toThrow(ValidationError)
  })
})
