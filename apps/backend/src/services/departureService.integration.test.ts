import {
  ASSET_STATUS,
  DEFAULT_OUTGOING_STATUS,
  DEPARTURE_STATUS,
  OUTGOING_STATUS,
  type OutgoingStatus,
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
  createLoadedDeparture,
  getAssetCost,
  getAssetHoldId,
  getAssetStatus,
  getHoldArchivedAt,
  setAssetStatus,
  assetCostOf,
  ALL_PRICE_PERMISSIONS,
  NO_PERMISSIONS,
  SALE_PRICE_ONLY,
  REDACTED_ASSET_COST,
  seedArrivalTestData,
  seedAssetCost,
  SEEDED_ASSET_COST,
  TEST_INVOICE_REFERENCE,
} from '../../test/factories.js'
import type { History } from '../../generated/prisma/client.js'
import { ConflictError, NotFoundError } from '../lib/errors.js'
import { prisma } from '../prisma.js'
import {
  addAssetsToDepartureAndRecord,
  completeDeparture,
  createDeparture,
  finishLoadingDeparture,
  getDeparture,
  getDepartureSummaries,
  markAssetMissingAtLoad,
  patchDepartureDate,
  patchDepartureMetadata,
  patchDepartureNotes,
  returnDepartureAssetsToStock,
  scanAssetLoaded,
  scheduleDeparture,
  setDepartureOutgoingStatus,
  startLoadingDeparture,
  undoAssetLoad,
} from './departureService.js'
import { createHold } from './holdService.js'
import { createInvoice } from './invoiceService.js'
import { createTransfer } from './transferService.js'

const TODAY = new Date().toISOString().slice(0, 10)
const FUTURE_DEPARTURE_DATE = '2099-06-15'
const FUTURE_RANGE_START = '2099-06-01'
const FUTURE_RANGE_END = '2099-06-30'

async function getAssetCollectionLinks(assetId: number) {
  return prisma.asset.findUniqueOrThrow({
    where: { id: assetId },
    select: { departure_id: true, sales_invoice_id: true },
  })
}

async function getDepartureStatus(departureNumber: string): Promise<string> {
  const departure = await prisma.departure.findUniqueOrThrow({
    where: { departure_number: departureNumber },
    select: { status: true },
  })
  return departure.status
}

async function getDepartureDate(departureNumber: string): Promise<string | null> {
  const departure = await prisma.departure.findUniqueOrThrow({
    where: { departure_number: departureNumber },
    select: { departure_date: true },
  })
  return departure.departure_date === null
    ? null
    : departure.departure_date.toISOString().slice(0, 10)
}

async function countAssetDepartureRows(assetIds: number[]): Promise<number> {
  return prisma.assetDeparture.count({ where: { asset_id: { in: assetIds } } })
}

function historyAfter(row: History, entityType: string, field: string): unknown {
  if (row.entity_type !== entityType) return undefined
  const changes = row.changes as { after?: Record<string, unknown> }
  if (!changes.after || !(field in changes.after)) return undefined
  return changes.after[field]
}

async function getMaxHistoryId(): Promise<number> {
  const { _max } = await prisma.history.aggregate({ _max: { id: true } })
  return _max.id ?? 0
}

describe('departureService', () => {
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

  async function createDraft(
    assets: { id: number; outgoing_status?: OutgoingStatus }[],
  ): Promise<string> {
    return createDeparture(
      buildCreateDepartureInput(
        refs,
        assets.map((a) => ({
          id: a.id,
          outgoing_status: a.outgoing_status ?? OUTGOING_STATUS.SOLD,
        })),
      ),
      refs.userId,
    )
  }

  async function createScheduled(assetIds: number[]): Promise<string> {
    const departureNumber = await createDraft(assetIds.map((id) => ({ id })))
    await scheduleDeparture(departureNumber, { departure_date: TODAY }, refs.userId)
    return departureNumber
  }

  async function createLoading(assetIds: number[]): Promise<string> {
    const departureNumber = await createScheduled(assetIds)
    await startLoadingDeparture(departureNumber, refs.userId)
    return departureNumber
  }

  describe('create and read', () => {
    it('returns asset cost, redacted by role permissions', async () => {
      const [asset] = await createArrivedAssets(refs, 1)
      const departureNumber = await createDraft([asset])
      await seedAssetCost(asset.id)

      const asAdmin = await getDeparture(departureNumber, ALL_PRICE_PERMISSIONS)
      expect(assetCostOf(asAdmin.assets[0])).toEqual(SEEDED_ASSET_COST)

      const asSales = await getDeparture(departureNumber, SALE_PRICE_ONLY)
      expect(assetCostOf(asSales.assets[0])).toEqual({
        ...REDACTED_ASSET_COST,
        sale_price: SEEDED_ASSET_COST.sale_price,
      })

      const asMember = await getDeparture(departureNumber, NO_PERMISSIONS)
      expect(assetCostOf(asMember.assets[0])).toEqual(REDACTED_ASSET_COST)
    })

    it('returns a null cost for an asset that has no Cost row', async () => {
      const [asset] = await createArrivedAssets(refs, 1)
      const departureNumber = await createDraft([asset])

      const departure = await getDeparture(departureNumber, ALL_PRICE_PERMISSIONS)
      expect(assetCostOf(departure.assets[0])).toEqual(REDACTED_ASSET_COST)
    })

    it('returns the sales invoices of its assets with the invoiced customer', async () => {
      const [invoiced, uninvoiced] = await createArrivedAssets(refs, 2)
      const { invoiceNumber } = await createInvoice(
        buildCreateInvoiceInput(refs, [invoiced], refs.invoiceTypeSaleId),
        refs.userId,
      )
      const departureNumber = await createDraft([invoiced, uninvoiced])

      const departure = await getDeparture(departureNumber, ALL_PRICE_PERMISSIONS)

      expect(departure.invoices).toEqual([
        {
          invoice_number: invoiceNumber,
          invoice_reference: TEST_INVOICE_REFERENCE,
          customer_id: refs.customer.id,
          customer: refs.customer.name,
        },
      ])
    })

    it('creates a Draft departure and leaves asset statuses and holds untouched', async () => {
      const [held, plain] = await createArrivedAssets(refs, 2)
      const holdNumber = await createHold(buildCreateHoldInput(refs, [held]), refs.userId)

      const departureNumber = await createDraft([held, plain])

      expect(await getDepartureStatus(departureNumber)).toBe(DEPARTURE_STATUS.DRAFT)
      expect(await getAssetStatus(held.id)).toBe(ASSET_STATUS.HELD)
      expect(await getAssetHoldId(held.id)).not.toBeNull()
      expect(await getAssetStatus(plain.id)).toBe(ASSET_STATUS.IN_STOCK)
      expect(await getHoldArchivedAt(holdNumber)).toBeNull()
    })

    it('reports each asset with its planned outgoing status and unloaded state', async () => {
      const [sold, returned] = await createArrivedAssets(refs, 2)
      const departureNumber = await createDraft([
        { id: sold.id, outgoing_status: OUTGOING_STATUS.SOLD },
        { id: returned.id, outgoing_status: OUTGOING_STATUS.RETURNED },
      ])

      const departure = await getDeparture(departureNumber, ALL_PRICE_PERMISSIONS)

      const byId = new Map(departure.assets.map((a) => [a.id, a]))
      expect(byId.get(sold.id)?.outgoing_status).toBe(OUTGOING_STATUS.SOLD)
      expect(byId.get(returned.id)?.outgoing_status).toBe(OUTGOING_STATUS.RETURNED)
      expect(departure.assets.every((a) => a.scan.loaded === false)).toBe(true)
    })

    it('numbers the departure D-<cityCode>-<7-digit sequence>', async () => {
      const [asset] = await createArrivedAssets(refs, 1)
      const departureNumber = await createDraft([asset])
      expect(departureNumber).toMatch(/^D-YYZ-\d{7}$/)
    })

    it('rejects an asset that is missing, on another departure or on an open transfer', async () => {
      const [missing, onDeparture, onTransfer] = await createArrivedAssets(refs, 3)
      await setAssetStatus(missing.id, ASSET_STATUS.MISSING)
      await createDraft([onDeparture])
      await createTransfer(buildCreateTransferInput(refs, [onTransfer]), refs.userId)

      for (const asset of [missing, onDeparture, onTransfer]) {
        await expect(createDraft([asset])).rejects.toThrow(ConflictError)
      }
    })
  })

  describe('editing in Draft', () => {
    it('adds assets with the default outgoing status and removes others, keeping rows in step', async () => {
      const [first, second] = await createArrivedAssets(refs, 2)
      const departureNumber = await createDraft([
        { id: first.id, outgoing_status: OUTGOING_STATUS.RETURNED },
      ])

      await addAssetsToDepartureAndRecord(
        departureNumber,
        { assetIdsToAdd: [second.id], assetIdsToRemove: [first.id] },
        refs.userId,
      )

      expect(await countAssetDepartureRows([first.id])).toBe(0)
      expect((await getAssetCollectionLinks(first.id)).departure_id).toBeNull()
      const departure = await getDeparture(departureNumber, ALL_PRICE_PERMISSIONS)
      expect(departure.assets.map((a) => [a.id, a.outgoing_status])).toEqual([
        [second.id, DEFAULT_OUTGOING_STATUS],
      ])
    })

    it('keeps a missing asset and an open-transfer asset off an existing departure', async () => {
      const [departing, missing, onTransfer] = await createArrivedAssets(refs, 3)
      const departureNumber = await createDraft([departing])
      await setAssetStatus(missing.id, ASSET_STATUS.MISSING)
      await createTransfer(buildCreateTransferInput(refs, [onTransfer]), refs.userId)

      for (const asset of [missing, onTransfer]) {
        await expect(
          addAssetsToDepartureAndRecord(
            departureNumber,
            { assetIdsToAdd: [asset.id], assetIdsToRemove: [] },
            refs.userId,
          ),
        ).rejects.toThrow(ConflictError)
      }
    })

    it('rejects removing an asset that is not on the departure', async () => {
      const [onDeparture, stranger] = await createArrivedAssets(refs, 2)
      const departureNumber = await createDraft([onDeparture])

      await expect(
        addAssetsToDepartureAndRecord(
          departureNumber,
          { assetIdsToAdd: [], assetIdsToRemove: [stranger.id] },
          refs.userId,
        ),
      ).rejects.toThrow(ConflictError)
    })

    it('changes the planned outgoing status only for assets on the departure', async () => {
      const [onDeparture, stranger] = await createArrivedAssets(refs, 2)
      const departureNumber = await createDraft([onDeparture])

      await setDepartureOutgoingStatus(departureNumber, [onDeparture.id], OUTGOING_STATUS.SCRAPPED)

      const departure = await getDeparture(departureNumber, ALL_PRICE_PERMISSIONS)
      expect(departure.assets[0].outgoing_status).toBe(OUTGOING_STATUS.SCRAPPED)
      expect(await getAssetStatus(onDeparture.id)).toBe(ASSET_STATUS.IN_STOCK)
      await expect(
        setDepartureOutgoingStatus(departureNumber, [stranger.id], OUTGOING_STATUS.SCRAPPED),
      ).rejects.toThrow(ConflictError)
    })

    it('locks assets, metadata and outgoing status once scheduled, but not the notes', async () => {
      const [asset, extra] = await createArrivedAssets(refs, 2)
      const departureNumber = await createScheduled([asset.id])
      const departure = await getDeparture(departureNumber, ALL_PRICE_PERMISSIONS)

      await expect(
        addAssetsToDepartureAndRecord(
          departureNumber,
          { assetIdsToAdd: [extra.id], assetIdsToRemove: [] },
          refs.userId,
        ),
      ).rejects.toThrow(ConflictError)
      await expect(
        addAssetsToDepartureAndRecord(
          departureNumber,
          { assetIdsToAdd: [], assetIdsToRemove: [asset.id] },
          refs.userId,
        ),
      ).rejects.toThrow(ConflictError)
      await expect(
        setDepartureOutgoingStatus(departureNumber, [asset.id], OUTGOING_STATUS.SCRAPPED),
      ).rejects.toThrow(ConflictError)
      await expect(
        patchDepartureMetadata(
          departureNumber,
          {
            origin: departure.origin,
            customer: departure.customer,
            transporter: departure.transporter,
            salesperson: departure.salesperson!,
            comment: 'changed',
          },
          refs.userId,
        ),
      ).rejects.toThrow(ConflictError)

      await patchDepartureNotes(departureNumber, 'still editable')
      const updated = await prisma.departure.findUniqueOrThrow({
        where: { departure_number: departureNumber },
        select: { notes: true },
      })
      expect(updated.notes).toBe('still editable')
    })
  })

  describe('schedule and date', () => {
    it('moves Draft to Scheduled, sets the date and records both', async () => {
      const [asset] = await createArrivedAssets(refs, 1)
      const departureNumber = await createDraft([asset])
      const sinceId = await getMaxHistoryId()

      await scheduleDeparture(
        departureNumber,
        { departure_date: FUTURE_DEPARTURE_DATE },
        refs.userId,
      )

      expect(await getDepartureStatus(departureNumber)).toBe(DEPARTURE_STATUS.SCHEDULED)
      expect(await getDepartureDate(departureNumber)).toBe(FUTURE_DEPARTURE_DATE)
      const rows = await prisma.history.findMany({ where: { id: { gt: sinceId } } })
      expect(rows.some((r) => historyAfter(r, 'Departure', 'status') === 'SCHEDULED')).toBe(true)
      expect(
        rows.some((r) => historyAfter(r, 'Departure', 'departure_date') === FUTURE_DEPARTURE_DATE),
      ).toBe(true)
    })

    it('rejects scheduling an empty or already scheduled departure', async () => {
      const [asset] = await createArrivedAssets(refs, 1)
      const departureNumber = await createDraft([asset])
      await addAssetsToDepartureAndRecord(
        departureNumber,
        { assetIdsToAdd: [], assetIdsToRemove: [asset.id] },
        refs.userId,
      )

      await expect(
        scheduleDeparture(departureNumber, { departure_date: TODAY }, refs.userId),
      ).rejects.toThrow(ConflictError)

      const [other] = await createArrivedAssets(refs, 1)
      const scheduledNumber = await createScheduled([other.id])
      await expect(
        scheduleDeparture(scheduledNumber, { departure_date: TODAY }, refs.userId),
      ).rejects.toThrow(ConflictError)
    })

    it('edits the date only while Scheduled and records the change', async () => {
      const [asset] = await createArrivedAssets(refs, 1)
      const draftNumber = await createDraft([asset])
      await expect(
        patchDepartureDate(draftNumber, { departure_date: FUTURE_DEPARTURE_DATE }, refs.userId),
      ).rejects.toThrow(ConflictError)

      await scheduleDeparture(draftNumber, { departure_date: TODAY }, refs.userId)
      const sinceId = await getMaxHistoryId()
      await patchDepartureDate(draftNumber, { departure_date: FUTURE_DEPARTURE_DATE }, refs.userId)

      expect(await getDepartureDate(draftNumber)).toBe(FUTURE_DEPARTURE_DATE)
      const rows = await prisma.history.findMany({ where: { id: { gt: sinceId } } })
      expect(
        rows.some((r) => historyAfter(r, 'Departure', 'departure_date') === FUTURE_DEPARTURE_DATE),
      ).toBe(true)

      await startLoadingDeparture(draftNumber, refs.userId)
      await expect(
        patchDepartureDate(draftNumber, { departure_date: FUTURE_DEPARTURE_DATE }, refs.userId),
      ).rejects.toThrow(ConflictError)
    })

    it('rejects a date change on an unknown departure', async () => {
      await expect(
        patchDepartureDate('D-XXX-0000000', { departure_date: FUTURE_DEPARTURE_DATE }, refs.userId),
      ).rejects.toThrow(NotFoundError)
    })

    it('lists departures by departure date, falling back to the creation day', async () => {
      const [datedAsset, undatedAsset] = await createArrivedAssets(refs, 2)
      const datedNumber = await createDraft([datedAsset])
      await scheduleDeparture(datedNumber, { departure_date: FUTURE_DEPARTURE_DATE }, refs.userId)
      const undatedNumber = await createDraft([undatedAsset])

      const inFutureRange = await getDepartureSummaries(
        new Date(FUTURE_RANGE_START),
        new Date(FUTURE_RANGE_END),
        0,
        0,
      )
      const inTodayRange = await getDepartureSummaries(new Date(TODAY), new Date(TODAY), 0, 0)

      expect(inFutureRange.map((d) => d.departure_number)).toEqual([datedNumber])
      expect(inFutureRange[0].departure_date).toBe(FUTURE_DEPARTURE_DATE)
      expect(inFutureRange[0].status).toBe(DEPARTURE_STATUS.SCHEDULED)
      expect(inTodayRange.map((d) => d.departure_number)).toEqual([undatedNumber])
      expect(inTodayRange[0].departure_date).toBeNull()
    })

    it('shows the departed date on an asset only once it is loaded', async () => {
      const [asset] = await createArrivedAssets(refs, 1)
      const departureNumber = await createLoading([asset.id])

      const before = await getDeparture(departureNumber, ALL_PRICE_PERMISSIONS)
      expect(before.assets[0].departed_at).toBeNull()

      await scanAssetLoaded(departureNumber, asset.id, refs.userId)

      const after = await getDeparture(departureNumber, ALL_PRICE_PERMISSIONS)
      expect(after.assets[0].departed_at).toBe(TODAY)
    })
  })

  describe('start loading', () => {
    it('snaps the date to today, records the date change, and rejects a non-Scheduled departure', async () => {
      const [asset] = await createArrivedAssets(refs, 1)
      const departureNumber = await createDraft([asset])
      await expect(startLoadingDeparture(departureNumber, refs.userId)).rejects.toThrow(
        ConflictError,
      )
      await scheduleDeparture(
        departureNumber,
        { departure_date: FUTURE_DEPARTURE_DATE },
        refs.userId,
      )
      const sinceId = await getMaxHistoryId()

      await startLoadingDeparture(departureNumber, refs.userId)

      expect(await getDepartureStatus(departureNumber)).toBe(DEPARTURE_STATUS.LOADING_IN_PROGRESS)
      expect(await getDepartureDate(departureNumber)).toBe(TODAY)
      const rows = await prisma.history.findMany({ where: { id: { gt: sinceId } } })
      expect(rows.some((r) => historyAfter(r, 'Departure', 'departure_date') === TODAY)).toBe(true)
    })

    it('records no date entry when the date is already today', async () => {
      const [asset] = await createArrivedAssets(refs, 1)
      const departureNumber = await createScheduled([asset.id])
      const sinceId = await getMaxHistoryId()

      await startLoadingDeparture(departureNumber, refs.userId)

      const rows = await prisma.history.findMany({ where: { id: { gt: sinceId } } })
      expect(rows.some((r) => historyAfter(r, 'Departure', 'departure_date') !== undefined)).toBe(
        false,
      )
    })

    it('stays Scheduled when an asset is no longer in stock or held', async () => {
      const [asset] = await createArrivedAssets(refs, 1)
      const departureNumber = await createScheduled([asset.id])
      await setAssetStatus(asset.id, ASSET_STATUS.HARVESTED)

      await expect(startLoadingDeparture(departureNumber, refs.userId)).rejects.toThrow(
        ConflictError,
      )
      expect(await getDepartureStatus(departureNumber)).toBe(DEPARTURE_STATUS.SCHEDULED)
    })
  })

  describe('loading', () => {
    it('sells each asset with its own planned outgoing status when scanned', async () => {
      const [sold, returned] = await createArrivedAssets(refs, 2)
      const departureNumber = await createDraft([
        { id: sold.id, outgoing_status: OUTGOING_STATUS.SOLD },
        { id: returned.id, outgoing_status: OUTGOING_STATUS.RETURNED },
      ])
      await scheduleDeparture(departureNumber, { departure_date: TODAY }, refs.userId)
      await startLoadingDeparture(departureNumber, refs.userId)

      await scanAssetLoaded(departureNumber, sold.id, refs.userId)
      expect(await getAssetStatus(returned.id)).toBe(ASSET_STATUS.IN_STOCK)
      await scanAssetLoaded(departureNumber, returned.id, refs.userId)

      expect(await getAssetStatus(sold.id)).toBe(OUTGOING_STATUS.SOLD)
      expect(await getAssetStatus(returned.id)).toBe(OUTGOING_STATUS.RETURNED)
    })

    it('releases a held asset and archives the hold it emptied when scanned', async () => {
      const [asset] = await createArrivedAssets(refs, 1)
      const holdNumber = await createHold(buildCreateHoldInput(refs, [asset]), refs.userId)
      const departureNumber = await createLoading([asset.id])
      expect(await getHoldArchivedAt(holdNumber)).toBeNull()

      await scanAssetLoaded(departureNumber, asset.id, refs.userId)

      expect(await getAssetHoldId(asset.id)).toBeNull()
      expect(await getHoldArchivedAt(holdNumber)).not.toBeNull()
    })

    it('keeps a hold active when only some of its assets are loaded', async () => {
      const [departing, staying] = await createArrivedAssets(refs, 2)
      const holdNumber = await createHold(
        buildCreateHoldInput(refs, [departing, staying]),
        refs.userId,
      )
      const departureNumber = await createLoading([departing.id])

      await scanAssetLoaded(departureNumber, departing.id, refs.userId)

      expect(await getAssetHoldId(departing.id)).toBeNull()
      expect(await getAssetHoldId(staying.id)).not.toBeNull()
      expect(await getHoldArchivedAt(holdNumber)).toBeNull()
    })

    it('records the status change against the asset when scanned', async () => {
      const [asset] = await createArrivedAssets(refs, 1)
      const departureNumber = await createLoading([asset.id])
      const sinceId = await getMaxHistoryId()

      await scanAssetLoaded(departureNumber, asset.id, refs.userId)

      const rows = await prisma.history.findMany({ where: { id: { gt: sinceId } } })
      expect(
        rows.some(
          (r) =>
            r.entity_type === 'Asset' &&
            r.entity_id === asset.id &&
            historyAfter(r, 'Asset', 'status') === OUTGOING_STATUS.SOLD,
        ),
      ).toBe(true)
    })

    it('rejects scanning outside Loading, unknown, loaded and missing assets', async () => {
      const [asset, stranger, missing] = await createArrivedAssets(refs, 3)
      const scheduledNumber = await createScheduled([asset.id, missing.id])
      await expect(scanAssetLoaded(scheduledNumber, asset.id, refs.userId)).rejects.toThrow(
        ConflictError,
      )
      await startLoadingDeparture(scheduledNumber, refs.userId)

      await expect(scanAssetLoaded(scheduledNumber, stranger.id, refs.userId)).rejects.toThrow(
        NotFoundError,
      )
      await scanAssetLoaded(scheduledNumber, asset.id, refs.userId)
      await expect(scanAssetLoaded(scheduledNumber, asset.id, refs.userId)).rejects.toThrow(
        ConflictError,
      )
      await markAssetMissingAtLoad(scheduledNumber, missing.id, refs.userId)
      await expect(scanAssetLoaded(scheduledNumber, missing.id, refs.userId)).rejects.toThrow(
        ConflictError,
      )
    })

    it('marks an asset missing at load, keeping it linked, and rejects a loaded one', async () => {
      const [missing, loaded] = await createArrivedAssets(refs, 2)
      const departureNumber = await createLoading([missing.id, loaded.id])
      await scanAssetLoaded(departureNumber, loaded.id, refs.userId)

      await markAssetMissingAtLoad(departureNumber, missing.id, refs.userId)

      expect(await getAssetStatus(missing.id)).toBe(ASSET_STATUS.MISSING)
      expect((await getAssetCollectionLinks(missing.id)).departure_id).not.toBeNull()
      await expect(markAssetMissingAtLoad(departureNumber, loaded.id, refs.userId)).rejects.toThrow(
        ConflictError,
      )
    })

    it('undoes a load back to In Stock and rejects undoing an unloaded asset', async () => {
      const [asset, other] = await createArrivedAssets(refs, 2)
      const departureNumber = await createLoading([asset.id, other.id])
      await scanAssetLoaded(departureNumber, asset.id, refs.userId)

      await undoAssetLoad(departureNumber, asset.id, refs.userId)

      expect(await getAssetStatus(asset.id)).toBe(ASSET_STATUS.IN_STOCK)
      await expect(undoAssetLoad(departureNumber, other.id, refs.userId)).rejects.toThrow(
        ConflictError,
      )
    })
  })

  describe('finish and complete', () => {
    it('rejects finishing while an asset is neither loaded nor missing', async () => {
      const [loaded, pending] = await createArrivedAssets(refs, 2)
      const departureNumber = await createLoading([loaded.id, pending.id])
      await scanAssetLoaded(departureNumber, loaded.id, refs.userId)

      await expect(finishLoadingDeparture(departureNumber, refs.userId)).rejects.toThrow(
        ConflictError,
      )
      expect(await getDepartureStatus(departureNumber)).toBe(DEPARTURE_STATUS.LOADING_IN_PROGRESS)
    })

    it('rejects finishing when nothing was loaded', async () => {
      const [missing] = await createArrivedAssets(refs, 1)
      const departureNumber = await createLoading([missing.id])
      await markAssetMissingAtLoad(departureNumber, missing.id, refs.userId)

      await expect(finishLoadingDeparture(departureNumber, refs.userId)).rejects.toThrow(
        ConflictError,
      )
    })

    it('finishes with a missing asset resolved, then completes only from Loaded', async () => {
      const [loaded, missing] = await createArrivedAssets(refs, 2)
      const departureNumber = await createLoading([loaded.id, missing.id])
      await expect(completeDeparture(departureNumber, refs.userId)).rejects.toThrow(ConflictError)
      await scanAssetLoaded(departureNumber, loaded.id, refs.userId)
      await markAssetMissingAtLoad(departureNumber, missing.id, refs.userId)

      await finishLoadingDeparture(departureNumber, refs.userId)
      expect(await getDepartureStatus(departureNumber)).toBe(DEPARTURE_STATUS.LOADED)

      await completeDeparture(departureNumber, refs.userId)
      expect(await getDepartureStatus(departureNumber)).toBe(DEPARTURE_STATUS.COMPLETE)
    })
  })

  describe('returnDepartureAssetsToStock', () => {
    it('returns loaded assets to stock, clearing the departure, sales invoice and sale price', async () => {
      const [asset] = await createArrivedAssets(refs, 1)
      await seedAssetCost(asset.id)
      await createInvoice(
        buildCreateInvoiceInput(refs, [asset], refs.invoiceTypeSaleId),
        refs.userId,
      )
      const departureNumber = await createLoadedDeparture(refs, [
        { id: asset.id, outgoing_status: OUTGOING_STATUS.SOLD },
      ])

      await returnDepartureAssetsToStock(departureNumber, [asset.id], refs.userId)

      expect(await getAssetStatus(asset.id)).toBe(ASSET_STATUS.IN_STOCK)
      expect(await getAssetCollectionLinks(asset.id)).toEqual({
        departure_id: null,
        sales_invoice_id: null,
      })
      expect(await getAssetCost(asset.id)).toEqual({ ...SEEDED_ASSET_COST, sale_price: null })
      expect(await countAssetDepartureRows([asset.id])).toBe(0)
    })

    it('rejects assets that are not loaded yet', async () => {
      const [asset] = await createArrivedAssets(refs, 1)
      const departureNumber = await createLoading([asset.id])

      await expect(
        returnDepartureAssetsToStock(departureNumber, [asset.id], refs.userId),
      ).rejects.toThrow(ConflictError)
      expect(await getAssetStatus(asset.id)).toBe(ASSET_STATUS.IN_STOCK)
    })

    it('leaves assets on other departures untouched when the ids do not match', async () => {
      const [onDeparture, stranger] = await createArrivedAssets(refs, 2)
      const departureNumber = await createLoadedDeparture(refs, [
        { id: onDeparture.id, outgoing_status: OUTGOING_STATUS.SOLD },
      ])
      await seedAssetCost(stranger.id)
      await createLoadedDeparture(refs, [
        { id: stranger.id, outgoing_status: OUTGOING_STATUS.RETURNED },
      ])

      await expect(
        returnDepartureAssetsToStock(departureNumber, [stranger.id], refs.userId),
      ).rejects.toThrow(ConflictError)

      expect(await getAssetStatus(stranger.id)).toBe(OUTGOING_STATUS.RETURNED)
      expect(await getAssetCost(stranger.id)).toEqual(SEEDED_ASSET_COST)
    })

    it('reverts an emptied Loading departure to Draft and keeps a Completed one', async () => {
      const [loadingAsset, completedAsset, otherAsset] = await createArrivedAssets(refs, 3)
      const loadingNumber = await createLoadedDeparture(refs, [
        { id: loadingAsset.id, outgoing_status: OUTGOING_STATUS.SOLD },
      ])
      const completedNumber = await createLoadedDeparture(refs, [
        { id: completedAsset.id, outgoing_status: OUTGOING_STATUS.SOLD },
        { id: otherAsset.id, outgoing_status: OUTGOING_STATUS.SOLD },
      ])
      await finishLoadingDeparture(completedNumber, refs.userId)
      await completeDeparture(completedNumber, refs.userId)

      await returnDepartureAssetsToStock(loadingNumber, [loadingAsset.id], refs.userId)
      await returnDepartureAssetsToStock(
        completedNumber,
        [completedAsset.id, otherAsset.id],
        refs.userId,
      )

      expect(await getDepartureStatus(loadingNumber)).toBe(DEPARTURE_STATUS.DRAFT)
      expect(await getDepartureStatus(completedNumber)).toBe(DEPARTURE_STATUS.COMPLETE)
    })

    it('leaves the other assets on the same sales invoice untouched', async () => {
      const [returned, staying] = await createArrivedAssets(refs, 2)
      await seedAssetCost(returned.id)
      await seedAssetCost(staying.id)
      await createInvoice(
        buildCreateInvoiceInput(refs, [returned, staying], refs.invoiceTypeSaleId),
        refs.userId,
      )
      const departureNumber = await createLoadedDeparture(refs, [
        { id: returned.id, outgoing_status: OUTGOING_STATUS.SOLD },
        { id: staying.id, outgoing_status: OUTGOING_STATUS.SOLD },
      ])

      await returnDepartureAssetsToStock(departureNumber, [returned.id], refs.userId)

      const stayingLinks = await getAssetCollectionLinks(staying.id)
      expect(stayingLinks.sales_invoice_id).not.toBeNull()
      expect(stayingLinks.departure_id).not.toBeNull()
      expect(await getAssetCost(staying.id)).toEqual(SEEDED_ASSET_COST)
    })

    it('records the return against the departure, the invoice and the asset', async () => {
      const [asset] = await createArrivedAssets(refs, 1)
      await seedAssetCost(asset.id)
      await createInvoice(
        buildCreateInvoiceInput(refs, [asset], refs.invoiceTypeSaleId),
        refs.userId,
      )
      const departureNumber = await createLoadedDeparture(refs, [
        { id: asset.id, outgoing_status: OUTGOING_STATUS.SOLD },
      ])
      const sinceId = await getMaxHistoryId()

      await returnDepartureAssetsToStock(departureNumber, [asset.id], refs.userId)

      const newRows = await prisma.history.findMany({ where: { id: { gt: sinceId } } })
      expect(
        newRows.some((r) => r.entity_type === 'Departure' && r.action_type === 'ASSETS_REMOVED'),
      ).toBe(true)
      expect(
        newRows.some((r) => r.entity_type === 'Invoice' && r.action_type === 'ASSETS_REMOVED'),
      ).toBe(true)

      // The sale price is a permission-gated channel and lands on its own entity type.
      const changesFor = (entityType: string) =>
        newRows
          .filter((r) => r.entity_type === entityType && r.entity_id === asset.id)
          .map(
            (r) =>
              r.changes as { before?: Record<string, unknown>; after?: Record<string, unknown> },
          )

      const priceChange = changesFor('AssetSalePrice').find(
        (c) => c.after?.sale_price !== undefined,
      )
      expect(priceChange?.before?.sale_price).toBe(SEEDED_ASSET_COST.sale_price)
      expect(priceChange?.after?.sale_price).toBeNull()
      expect(changesFor('Asset').some((c) => c.after?.status === ASSET_STATUS.IN_STOCK)).toBe(true)
    })
  })
})
