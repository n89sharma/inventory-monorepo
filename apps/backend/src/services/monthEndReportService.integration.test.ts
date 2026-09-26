import { OUTGOING_STATUS, type RecordStoreTransaction } from 'shared-types'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import {
  ArrivalTestData,
  buildCreateDepartureInput,
  buildCreateHoldInput,
  buildCreateTransferInput,
  cleanupTransactionalData,
  createArrivedAssets,
  seedArrivalTestData,
  seedAssetCost,
  seedBrand,
  seedModel,
} from '../../test/factories.js'
import { prisma } from '../prisma.js'
import { createDeparture } from './departureService.js'
import { createHold } from './holdService.js'
import {
  createManualMonthEndReport,
  createScheduledMonthEndReport,
  deleteMonthEndReports,
  getMonthEndReport,
  getMonthEndReports,
} from './monthEndReportService.js'
import { recordStoreTransaction } from './storePartService.js'
import { createTransfer, dispatchTransfer } from './transferService.js'

const INACTIVE_CODE = 'ZZZ'
const INACTIVE_STREET = 'Closed Warehouse'
const PERIOD = '2026-09'
const FINISHER_ASSET_TYPE = 'FINISHER'
const FINISHER_MODEL_NAME = 'TEST-FINISHER'
const ALL_FILTERS = { brandGroup: undefined, assetGroup: undefined, warehouseIds: [] }

describe('monthEndReportService', () => {
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

  async function purchaseParts(quantity: number, unitCost: number): Promise<void> {
    const purchase: RecordStoreTransaction = {
      kind: 'PURCHASE',
      part: { mode: 'new', part_number: 'TEST-MONTH-END-PART', description: 'Test part' },
      warehouse_id: refs.warehouse.id,
      quantity,
      unit_cost: unitCost,
      notes: null,
    }
    await recordStoreTransaction(purchase, refs.userId)
  }

  async function moveToInactiveWarehouse(assetId: number): Promise<void> {
    const warehouse = await prisma.warehouse.upsert({
      where: { city_code_street: { city_code: INACTIVE_CODE, street: INACTIVE_STREET } },
      create: { city_code: INACTIVE_CODE, street: INACTIVE_STREET, is_active: false },
      update: {},
    })
    const location = await prisma.location.create({
      data: { warehouse_id: warehouse.id, zone_id: refs.binZoneId, bin: 'A1' },
    })
    await prisma.asset.update({ where: { id: assetId }, data: { location_id: location.id } })
  }

  it('captures in-stock and held assets in active warehouses', async () => {
    const [inStock, held] = await createArrivedAssets(refs, 2)
    await createHold(buildCreateHoldInput(refs, [held]), refs.userId)

    const reportId = await createManualMonthEndReport(refs.userId)
    const { assets } = await getMonthEndReport(reportId, ALL_FILTERS)

    expect(assets.map((line) => line.barcode).sort()).toEqual(
      [inStock.barcode, held.barcode].sort(),
    )
    const heldLine = assets.find((line) => line.barcode === held.barcode)
    expect(heldLine?.status).toBe('HELD')
    expect(heldLine?.hold_number).not.toBeNull()
  })

  it('leaves out departed assets and assets in inactive warehouses', async () => {
    const [kept, sold, parked] = await createArrivedAssets(refs, 3)
    await createDeparture(
      buildCreateDepartureInput(refs, [{ id: sold.id, outgoing_status: OUTGOING_STATUS.SOLD }]),
      refs.userId,
    )
    await moveToInactiveWarehouse(parked.id)

    const reportId = await createManualMonthEndReport(refs.userId)
    const { assets } = await getMonthEndReport(reportId, ALL_FILTERS)

    expect(assets.map((line) => line.barcode)).toEqual([kept.barcode])
  })

  it('files a dispatched asset under its transfer origin as in transit', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    await seedAssetCost(asset.id)
    const transferNumber = await createTransfer(
      buildCreateTransferInput(refs, [asset]),
      refs.userId,
    )
    await dispatchTransfer(transferNumber, refs.userId, null)

    const reportId = await createManualMonthEndReport(refs.userId)
    const { assets, summary } = await getMonthEndReport(reportId, ALL_FILTERS)

    expect(assets).toHaveLength(1)
    expect(assets[0]).toMatchObject({
      warehouse_id: refs.warehouse.id,
      is_in_transit: true,
      transfer_number: transferNumber,
    })
    expect(summary.warehouses[0].in_transit).toEqual({
      base: 100,
      freight: 20,
      base_freight: 120,
      total: 195,
    })
  })

  it('records the FIFO parts value per warehouse and adds it to the total', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    await seedAssetCost(asset.id)
    await purchaseParts(4, 12.5)

    const reportId = await createManualMonthEndReport(refs.userId)
    const { summary } = await getMonthEndReport(reportId, ALL_FILTERS)

    expect(summary.company.parts_value).toBe(50)
    expect(summary.company.total.total).toBe(245)
  })

  it('narrows assets and summary by brand group and drops parts', async () => {
    const [canonAsset] = await createArrivedAssets(refs, 1)
    const otherBrandId = await seedBrand('TEST-RICOH')
    const otherModelId = await seedModel(otherBrandId, 'TEST-MP-C3004', false)
    const [otherAsset] = await createArrivedAssets(refs, 1)
    await prisma.asset.update({ where: { id: otherAsset.id }, data: { model_id: otherModelId } })
    await purchaseParts(1, 10)

    const reportId = await createManualMonthEndReport(refs.userId)
    const nonCanon = await getMonthEndReport(reportId, { ...ALL_FILTERS, brandGroup: 'NON_CANON' })
    const canon = await getMonthEndReport(reportId, { ...ALL_FILTERS, brandGroup: 'CANON' })

    expect(nonCanon.assets.map((line) => line.barcode)).toEqual([otherAsset.barcode])
    expect(canon.assets.map((line) => line.barcode)).toEqual([canonAsset.barcode])
    expect(canon.summary.company.parts_value).toBeNull()
  })

  it('narrows assets and summary by asset group and drops parts', async () => {
    const [copier] = await createArrivedAssets(refs, 1)
    const finisherType = await prisma.assetType.upsert({
      where: { asset_type: FINISHER_ASSET_TYPE },
      create: { asset_type: FINISHER_ASSET_TYPE },
      update: {},
    })
    const finisherModel = await prisma.model.upsert({
      where: { brand_id_name: { brand_id: refs.brandId, name: FINISHER_MODEL_NAME } },
      create: {
        name: FINISHER_MODEL_NAME,
        weight: 1,
        size: 1,
        brand_id: refs.brandId,
        asset_type_id: finisherType.id,
      },
      update: {},
    })
    const [finisher] = await createArrivedAssets(refs, 1)
    await prisma.asset.update({ where: { id: finisher.id }, data: { model_id: finisherModel.id } })
    await purchaseParts(1, 10)

    const reportId = await createManualMonthEndReport(refs.userId)
    const copiers = await getMonthEndReport(reportId, { ...ALL_FILTERS, assetGroup: 'COPIER' })
    const others = await getMonthEndReport(reportId, { ...ALL_FILTERS, assetGroup: 'NON_COPIER' })

    expect(copiers.assets.map((line) => line.barcode)).toEqual([copier.barcode])
    expect(others.assets.map((line) => line.barcode)).toEqual([finisher.barcode])
    expect(others.assets[0].asset_type).toBe(FINISHER_ASSET_TYPE)
    expect(copiers.summary.company.parts_value).toBeNull()
  })

  it('narrows by warehouse', async () => {
    await createArrivedAssets(refs, 1)

    const reportId = await createManualMonthEndReport(refs.userId)
    const report = await getMonthEndReport(reportId, {
      ...ALL_FILTERS,
      warehouseIds: [refs.warehouse2.id],
    })

    expect(report.assets).toEqual([])
    expect(report.summary.warehouses).toEqual([])
  })

  it('skips a scheduled capture when the period already has one', async () => {
    await createArrivedAssets(refs, 1)

    const firstId = await createScheduledMonthEndReport(PERIOD)
    const secondId = await createScheduledMonthEndReport(PERIOD)

    expect(firstId).not.toBeNull()
    expect(secondId).toBeNull()
    expect(await prisma.monthEndReport.count()).toBe(1)
  })

  it('deletes several reports with their captured lines', async () => {
    await createArrivedAssets(refs, 1)
    const manualId = await createManualMonthEndReport(refs.userId)
    const scheduledId = await createScheduledMonthEndReport(PERIOD)
    const keptId = await createManualMonthEndReport(refs.userId)

    await deleteMonthEndReports([manualId, scheduledId ?? -1])

    const remaining = await getMonthEndReports()
    expect(remaining.map((report) => report.id)).toEqual([keptId])
    expect(await prisma.monthEndReportAsset.count({ where: { report_id: manualId } })).toBe(0)
  })
})
