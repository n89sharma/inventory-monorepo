import {
  OUTGOING_STATUS,
  type AddStorePartToAsset,
  type RecordStoreTransaction,
} from 'shared-types'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import {
  ArrivalTestData,
  buildCreateDepartureInput,
  buildCreateHoldInput,
  buildCreateInvoiceInput,
  buildCreateTransferInput,
  cleanupTransactionalData,
  createArrivedAssets,
  seedAccessory,
  seedArrivalTestData,
  seedAssetCost,
  seedError,
  TEST_INVOICE_REFERENCE,
} from '../../test/factories.js'
import { ConflictError, NotFoundError } from '../lib/errors.js'
import { prisma } from '../prisma.js'
import { createAssetSalvagedPart } from './assetPartService.js'
import { deleteAsset } from './assetDeleteService.js'
import { createDeparture } from './departureService.js'
import { createHold } from './holdService.js'
import { createInvoice } from './invoiceService.js'
import { addStorePartToAsset, recordStoreTransaction } from './storePartService.js'
import { createTransfer } from './transferService.js'

describe('assetDeleteService', () => {
  let refs: ArrivalTestData
  let partCounter = 0

  beforeAll(async () => {
    refs = await seedArrivalTestData()
  })

  afterEach(async () => {
    await cleanupTransactionalData()
  })

  afterAll(async () => {
    await cleanupTransactionalData()
  })

  async function purchaseNewPart(quantity: number, unitCost: number): Promise<number> {
    partCounter += 1
    const partNumber = `TEST-DELETE-PART-${partCounter}`
    const purchase: RecordStoreTransaction = {
      kind: 'PURCHASE',
      part: { mode: 'new', part_number: partNumber, description: 'Test part' },
      warehouse_id: refs.warehouse.id,
      quantity,
      unit_cost: unitCost,
      notes: null,
    }
    await recordStoreTransaction(purchase, refs.userId)
    const part = await prisma.storePart.findUniqueOrThrow({
      where: { part_number: partNumber },
      select: { id: true },
    })
    return part.id
  }

  it('deletes an asset and every row that belongs to it', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    const accessoryId = await seedAccessory('TEST-DELETE-ACCESSORY')
    const errorId = await seedError(refs.brandId, 'E-DEL-1')

    await seedAssetCost(asset.id)
    await prisma.assetAccessory.create({
      data: { asset_id: asset.id, accessory_id: accessoryId },
    })
    await prisma.assetError.create({
      data: { asset_id: asset.id, error_id: errorId, is_fixed: false },
    })
    await prisma.comment.create({
      data: {
        asset_id: asset.id,
        created_by_id: refs.userId,
        comment: 'scanned twice by mistake',
        created_at: new Date(),
        updated_at: new Date(),
      },
    })

    await deleteAsset(asset.barcode, refs.userId)

    expect(await prisma.asset.findUnique({ where: { id: asset.id } })).toBeNull()
    expect(await prisma.cost.findUnique({ where: { asset_id: asset.id } })).toBeNull()
    expect(
      await prisma.technicalSpecification.findUnique({ where: { asset_id: asset.id } }),
    ).toBeNull()
    expect(await prisma.assetAccessory.count({ where: { asset_id: asset.id } })).toBe(0)
    expect(await prisma.assetError.count({ where: { asset_id: asset.id } })).toBe(0)
    expect(await prisma.comment.count({ where: { asset_id: asset.id } })).toBe(0)
  })

  it('deletes an asset that is on an arrival and on a hold', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    await createHold(buildCreateHoldInput(refs, [asset]), refs.userId)

    await deleteAsset(asset.barcode, refs.userId)

    expect(await prisma.asset.findUnique({ where: { id: asset.id } })).toBeNull()
  })

  it('blocks an asset that is on a transfer', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    const transferNumber = await createTransfer(
      buildCreateTransferInput(refs, [asset]),
      refs.userId,
    )

    await expect(deleteAsset(asset.barcode, refs.userId)).rejects.toThrow(
      new ConflictError(
        `Asset ${asset.barcode} cannot be deleted because it is linked to transfer ${transferNumber}`,
      ),
    )
    expect(await prisma.asset.findUnique({ where: { id: asset.id } })).not.toBeNull()
  })

  it('blocks an asset that is on a departure', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    const departureNumber = await createDeparture(
      buildCreateDepartureInput(refs, [{ id: asset.id, outgoing_status: OUTGOING_STATUS.SOLD }]),
      refs.userId,
    )

    await expect(deleteAsset(asset.barcode, refs.userId)).rejects.toThrow(
      new ConflictError(
        `Asset ${asset.barcode} cannot be deleted because it is linked to departure ${departureNumber}`,
      ),
    )
  })

  it('blocks an asset that is on a sales invoice', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    await createInvoice(buildCreateInvoiceInput(refs, [asset], refs.invoiceTypeSaleId), refs.userId)

    await expect(deleteAsset(asset.barcode, refs.userId)).rejects.toThrow(
      new ConflictError(
        `Asset ${asset.barcode} cannot be deleted because it is linked to sales invoice ${TEST_INVOICE_REFERENCE}`,
      ),
    )
  })

  it('deletes an asset that is on a purchase invoice and keeps the invoice', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    const { invoiceNumber } = await createInvoice(
      buildCreateInvoiceInput(refs, [asset], refs.invoiceTypePurchaseId),
      refs.userId,
    )

    await deleteAsset(asset.barcode, refs.userId)

    expect(await prisma.asset.findUnique({ where: { id: asset.id } })).toBeNull()
    expect(
      await prisma.invoice.findUnique({ where: { invoice_number: invoiceNumber } }),
    ).not.toBeNull()
  })

  it('blocks an asset that has consumed a store part', async () => {
    const storePartId = await purchaseNewPart(10, 5)
    const [asset] = await createArrivedAssets(refs, 1)
    const consume: AddStorePartToAsset = {
      store_part_id: storePartId,
      warehouse_id: refs.warehouse.id,
      quantity: 2,
    }
    await addStorePartToAsset(asset.barcode, consume, refs.userId)

    await expect(deleteAsset(asset.barcode, refs.userId)).rejects.toThrow(
      new ConflictError(
        `Asset ${asset.barcode} cannot be deleted because it is linked to 1 consumed store part`,
      ),
    )
  })

  it('blocks both the recipient and the donor of a salvaged part', async () => {
    const [recipient, donor] = await createArrivedAssets(refs, 2)
    await createAssetSalvagedPart(
      recipient.barcode,
      { donor_barcode: donor.barcode, part: 'Fuser', is_exchange: false },
      refs.userId,
    )

    await expect(deleteAsset(recipient.barcode, refs.userId)).rejects.toThrow(
      new ConflictError(
        `Asset ${recipient.barcode} cannot be deleted because it is linked to 1 salvaged part`,
      ),
    )
    await expect(deleteAsset(donor.barcode, refs.userId)).rejects.toThrow(
      new ConflictError(
        `Asset ${donor.barcode} cannot be deleted because it is linked to 1 salvaged part`,
      ),
    )
  })

  it('reports every blocker in one message', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    const departureNumber = await createDeparture(
      buildCreateDepartureInput(refs, [{ id: asset.id, outgoing_status: OUTGOING_STATUS.SOLD }]),
      refs.userId,
    )
    await createInvoice(buildCreateInvoiceInput(refs, [asset], refs.invoiceTypeSaleId), refs.userId)

    await expect(deleteAsset(asset.barcode, refs.userId)).rejects.toThrow(
      new ConflictError(
        `Asset ${asset.barcode} cannot be deleted because it is linked to departure ${departureNumber}, sales invoice ${TEST_INVOICE_REFERENCE}`,
      ),
    )
  })

  it('throws when the barcode does not exist', async () => {
    await expect(deleteAsset('DOES-NOT-EXIST', refs.userId)).rejects.toThrow(NotFoundError)
  })
})
