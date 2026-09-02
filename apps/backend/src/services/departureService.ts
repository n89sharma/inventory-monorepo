import {
  Permission,
  ASSET_STATUS,
  AssetDelta,
  CreateDeparture,
  DEFAULT_OUTGOING_STATUS,
  DepartureDetail,
  OutgoingStatus,
  OutgoingStatusSchema,
  UpdateDepartureMetadata,
} from 'shared-types'
import type { Prisma } from '../../generated/prisma/client.js'
import { getAssetsForDepartures } from '../../generated/prisma/sql.js'
import { mapAssetSearchRow } from '../lib/asset-mappers.js'
import { redactSearchRowCost } from '../lib/cost-redaction.js'
import {
  addRemoveCollectionFromAssets,
  assertAssetsNotInCollection,
  recordCollectionAssetDelta,
} from '../lib/collection-assets.js'
import { getNextSequence } from '../lib/db-utils.js'
import { decimalToNumber } from '../lib/decimal.js'
import { ConflictError, NotFoundError } from '../lib/errors.js'
import { prisma } from '../prisma.js'
import { mapUser } from '../lib/user-mappers.js'
import {
  recordAssetStatusChange,
  recordAssetUpdate,
  recordDepartureCreate,
  recordDepartureUpdate,
} from './historyService.js'
import { archiveHoldsEmptiedByReleasedAssets, recordHoldRelease } from './holdService.js'

export async function getDeparture(
  departureNumber: string,
  permissions: ReadonlySet<Permission>,
): Promise<DepartureDetail> {
  const [departure, assets] = await Promise.all([
    prisma.departure.findUnique({
      where: { departure_number: departureNumber },
      include: {
        origin: true,
        destination: true,
        transporter: true,
        created_by: true,
        sales_representative: true,
      },
    }),
    prisma.$queryRawTyped(getAssetsForDepartures(departureNumber)),
  ])
  if (!departure) throw new NotFoundError(`Departure ${departureNumber} not found`)
  return {
    departure_number: departure.departure_number,
    origin: departure.origin,
    customer: departure.destination,
    transporter: departure.transporter,
    notes: departure.notes,
    created_at: departure.created_at,
    created_by: departure.created_by?.name,
    salesperson: departure.sales_representative && mapUser(departure.sales_representative),
    assets: assets.map((r) => redactSearchRowCost(mapAssetSearchRow(r), permissions)),
  }
}

export async function createDeparture(departure: CreateDeparture, userId: number): Promise<string> {
  const originCode = departure.origin.city_code
  const currentDateTime = new Date()
  const departureNumber = await getNewDepartureNumber(originCode)
  const assetIds = departure.assets.map((a) => a.id)
  const assetsPerOutgoingStatus = Object.groupBy(departure.assets, (asset) => asset.outgoing_status)

  const outgoingStatusRows = await prisma.status.findMany({
    where: { status: { in: [...OutgoingStatusSchema.options] } },
  })
  const statusIdByName = new Map(outgoingStatusRows.map((s) => [s.status, s.id]))

  const referencedStatuses = Object.keys(assetsPerOutgoingStatus)
  const unseededStatuses = referencedStatuses.filter((s) => !statusIdByName.has(s))
  if (unseededStatuses.length > 0)
    throw new Error(`Outgoing statuses not seeded in DB: ${unseededStatuses.join(', ')}`)

  const { newDeparture, priorStatusByAsset, holdRelease } = await prisma.$transaction(
    async (tx) => {
      await assertAssetsNotInCollection(
        tx,
        assetIds,
        { departure_id: { not: null } },
        (barcodes) =>
          new ConflictError(`Assets already assigned to a departure: ${barcodes.join(', ')}`),
      )

      const created = await tx.departure.create({
        data: {
          departure_number: departureNumber,
          origin: { connect: { id: departure.origin.id } },
          destination: { connect: { id: departure.customer.id } },
          transporter: { connect: { id: departure.transporter.id } },
          created_by: { connect: { id: userId } },
          sales_representative: { connect: { id: departure.salesperson_id } },
          notes: departure.comment,
          created_at: currentDateTime,
        },
      })

      const priorAssets = await tx.asset.findMany({
        where: { id: { in: assetIds } },
        select: { id: true, status_id: true, hold_id: true },
      })

      for (const [outgoingStatus, assetsForStatus] of Object.entries(assetsPerOutgoingStatus)) {
        if (!assetsForStatus) continue
        await tx.asset.updateMany({
          where: { id: { in: assetsForStatus.map((a) => a.id) } },
          data: {
            departure_id: created.id,
            status_id: statusIdByName.get(outgoingStatus)!,
            hold_id: null,
          },
        })
      }

      return {
        newDeparture: created,
        priorStatusByAsset: new Map(priorAssets.map((a) => [a.id, a.status_id])),
        holdRelease: await archiveHoldsEmptiedByReleasedAssets(tx, priorAssets, currentDateTime),
      }
    },
  )

  await recordDepartureCreate(
    newDeparture.id,
    {
      departure_number: departureNumber,
      origin_id: departure.origin.id,
      destination_id: departure.customer.id,
      sales_representative_id: departure.salesperson_id,
      created_at: currentDateTime,
    },
    userId,
  )

  await recordCollectionAssetDelta(
    'Departure',
    'departure_id',
    newDeparture.id,
    assetIds,
    [],
    userId,
  )

  await recordHoldRelease(holdRelease, currentDateTime, userId)

  for (const [outgoingStatus, assetsForStatus] of Object.entries(assetsPerOutgoingStatus)) {
    if (!assetsForStatus) continue
    const priorAssets = assetsForStatus.map((a) => ({
      id: a.id,
      status_id: priorStatusByAsset.get(a.id)!,
    }))
    await recordAssetStatusChange(priorAssets, statusIdByName.get(outgoingStatus)!, userId)
  }

  return departureNumber
}

export async function patchDepartureMetadata(
  departureNumber: string,
  metadata: UpdateDepartureMetadata,
  userId: number,
): Promise<void> {
  const current = await prisma.departure.findUnique({
    where: { departure_number: departureNumber },
    select: {
      id: true,
      origin_id: true,
      destination_id: true,
      transporter_id: true,
      sales_representative_id: true,
      notes: true,
    },
  })
  if (!current) throw new NotFoundError(`Departure ${departureNumber} not found`)

  await prisma.departure.update({
    where: { id: current.id },
    data: {
      origin_id: metadata.origin.id,
      destination_id: metadata.customer.id,
      transporter_id: metadata.transporter.id,
      sales_representative_id: metadata.salesperson.id,
      notes: metadata.comment,
    },
  })

  await recordDepartureUpdate(
    current.id,
    {
      origin_id: current.origin_id,
      destination_id: current.destination_id,
      transporter_id: current.transporter_id,
      sales_representative_id: current.sales_representative_id,
    },
    {
      origin_id: metadata.origin.id,
      destination_id: metadata.customer.id,
      transporter_id: metadata.transporter.id,
      sales_representative_id: metadata.salesperson.id,
    },
    userId,
  )
}

export async function addAssetsToDepartureAndRecord(
  departureNumber: string,
  delta: AssetDelta,
  userId: number,
): Promise<void> {
  if (delta.assetIdsToRemove.length > 0)
    throw new ConflictError('Assets cannot be removed from a departure')

  const departure = await prisma.departure.findUnique({
    where: { departure_number: departureNumber },
    select: { id: true },
  })
  if (!departure) throw new NotFoundError(`Departure ${departureNumber} not found`)

  const addStatus = await prisma.status.findUniqueOrThrow({
    where: { status: DEFAULT_OUTGOING_STATUS },
    select: { id: true },
  })

  const currentDateTime = new Date()

  const { priorAssets, holdRelease } = await prisma.$transaction(async (tx) => {
    const prior = await tx.asset.findMany({
      where: { id: { in: delta.assetIdsToAdd } },
      select: { id: true, status_id: true, hold_id: true },
    })
    await addRemoveCollectionFromAssets(tx, {
      assetsToAdd: delta.assetIdsToAdd,
      assetsToRemove: [],
      assetInCollectionWhere: { departure_id: { not: null } },
      assetInCollectionError: (barcodes) =>
        new ConflictError(`Assets already assigned to a departure: ${barcodes.join(', ')}`),
      add: { departure_id: departure.id, status_id: addStatus.id, hold_id: null },
      remove: {},
    })
    return {
      priorAssets: prior,
      holdRelease: await archiveHoldsEmptiedByReleasedAssets(tx, prior, currentDateTime),
    }
  })

  await recordCollectionAssetDelta(
    'Departure',
    'departure_id',
    departure.id,
    delta.assetIdsToAdd,
    [],
    userId,
  )

  await recordHoldRelease(holdRelease, currentDateTime, userId)

  await recordAssetStatusChange(priorAssets, addStatus.id, userId)
}

export async function setDepartureOutgoingStatus(
  departureNumber: string,
  assetIds: number[],
  outgoingStatus: OutgoingStatus,
  userId: number,
): Promise<void> {
  const departure = await prisma.departure.findUnique({
    where: { departure_number: departureNumber },
    select: { id: true },
  })
  if (!departure) throw new NotFoundError(`Departure ${departureNumber} not found`)

  const status = await prisma.status.findUniqueOrThrow({
    where: { status: outgoingStatus },
    select: { id: true },
  })

  const priorAssets = await prisma.$transaction(async (tx) => {
    const assets = await tx.asset.findMany({
      where: { id: { in: assetIds }, departure_id: departure.id },
      select: { id: true, status_id: true },
    })
    if (assets.length !== assetIds.length)
      throw new ConflictError('Some assets do not belong to this departure')

    await tx.asset.updateMany({
      where: { id: { in: assetIds }, departure_id: departure.id },
      data: { status_id: status.id },
    })
    return assets
  })

  await recordAssetStatusChange(priorAssets, status.id, userId)
}

type ReturnedAsset = {
  id: number
  status_id: number
  sales_invoice_id: number | null
  cost: { sale_price: Prisma.Decimal | null } | null
}

// Returned assets may sit on different sales invoices, so record one delta per invoice.
async function recordSalesInvoiceRelease(assets: ReturnedAsset[], userId: number): Promise<void> {
  const invoicedAssets = assets.filter((asset) => asset.sales_invoice_id !== null)
  const assetsByInvoice = Object.groupBy(invoicedAssets, (asset) => asset.sales_invoice_id!)
  for (const [invoiceId, group] of Object.entries(assetsByInvoice)) {
    if (!group) continue
    await recordCollectionAssetDelta(
      'Invoice',
      'sales_invoice_id',
      Number(invoiceId),
      [],
      group.map((asset) => asset.id),
      userId,
    )
  }
}

async function recordSalePriceClear(assets: ReturnedAsset[], userId: number): Promise<void> {
  const pricedAssets = assets.filter((asset) => asset.cost?.sale_price != null)
  await Promise.all(
    pricedAssets.map((asset) =>
      recordAssetUpdate(
        asset.id,
        { sale_price: decimalToNumber(asset.cost!.sale_price) },
        { sale_price: null },
        userId,
      ),
    ),
  )
}

export async function returnDepartureAssetsToStock(
  departureNumber: string,
  assetIds: number[],
  userId: number,
): Promise<void> {
  const departure = await prisma.departure.findUnique({
    where: { departure_number: departureNumber },
    select: { id: true },
  })
  if (!departure) throw new NotFoundError(`Departure ${departureNumber} not found`)

  const inStockStatus = await prisma.status.findUniqueOrThrow({
    where: { status: ASSET_STATUS.IN_STOCK },
    select: { id: true },
  })

  const priorAssets = await prisma.$transaction(async (tx) => {
    const assets = await tx.asset.findMany({
      where: { id: { in: assetIds }, departure_id: departure.id },
      select: {
        id: true,
        status_id: true,
        sales_invoice_id: true,
        cost: { select: { sale_price: true } },
      },
    })
    if (assets.length !== assetIds.length)
      throw new ConflictError('Some assets do not belong to this departure')

    await tx.asset.updateMany({
      where: { id: { in: assetIds }, departure_id: departure.id },
      data: { departure_id: null, status_id: inStockStatus.id, sales_invoice_id: null },
    })
    await tx.cost.updateMany({
      where: { asset_id: { in: assetIds } },
      data: { sale_price: null },
    })
    return assets
  })

  await recordCollectionAssetDelta('Departure', 'departure_id', departure.id, [], assetIds, userId)
  await recordAssetStatusChange(priorAssets, inStockStatus.id, userId)
  await recordSalesInvoiceRelease(priorAssets, userId)
  await recordSalePriceClear(priorAssets, userId)
}

async function getNewDepartureNumber(originCode: string): Promise<string> {
  const sequence = await getNextSequence('departure')
  return `D-${originCode}-${String(sequence).padStart(7, '0')}`
}
