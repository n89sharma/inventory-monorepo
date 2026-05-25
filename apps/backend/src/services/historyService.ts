import { CollectionHistory, CollectionHistoryRecord } from 'shared-types'
import { Prisma } from '../../generated/prisma/client.js'
import { prisma } from '../prisma.js'
import { logger } from '../lib/logger.js'

type HistoryEntityType =
  | 'Arrival'
  | 'Asset'
  | 'AssetSalePrice'
  | 'AssetPurchaseCost'
  | 'Departure'
  | 'Hold'
  | 'Invoice'
  | 'Transfer'

// ─── State types for CREATE ───────────────────────────────────────────────────

type ArrivalCreateState = {
  arrival_number: string
  origin_id: number
  destination_id: number
  created_at: Date
}

type AssetCreateState = {
  barcode: string
  serial_number: string
  model_id: number
  arrival_id?: number | null
}

type DepartureCreateState = {
  departure_number: string
  origin_id: number
  destination_id: number
  created_at: Date
}

type HoldCreateState = {
  hold_number: string
  created_for_id: number
  customer_id: number
  created_at: Date
}

type InvoiceCreateState = {
  invoice_number: string
  organization_id: number
  invoice_type_id: number
  created_at: Date
}

type TransferCreateState = {
  transfer_number: string
  origin_id: number
  destination_id: number
  created_at: Date
}

// ─── Field types for UPDATE diffs ─────────────────────────────────────────────

type ArrivalUpdateFields = Partial<{
  origin_id: number
  destination_id: number
  transporter_id: number
}>

type AssetUpdateFields = Partial<{
  arrival_id: number | null
  departure_id: number | null
  hold_id: number | null
  purchase_invoice_id: number | null
  location_id: number | null
  model_id: number
  serial_number: string
  readiness_id: number
  meter_black: number | null
  meter_colour: number | null
  meter_total: number | null
  cassettes: number | null
  internal_finisher: string | null
  drum_life_c: number | null
  drum_life_m: number | null
  drum_life_y: number | null
  drum_life_k: number | null
  toner_life_c: number | null
  toner_life_m: number | null
  toner_life_y: number | null
  toner_life_k: number | null
  purchase_cost: number | null
  transport_cost: number | null
  processing_cost: number | null
  other_cost: number | null
  parts_cost: number | null
  total_cost: number | null
  sale_price: number | null
  error_ids: number[]
}>

const PURCHASE_COST_FIELDS = [
  'purchase_cost',
  'transport_cost',
  'processing_cost',
  'other_cost',
  'parts_cost',
  'total_cost'
] as const

type DepartureUpdateFields = Partial<{
  origin_id: number
  destination_id: number
  transporter_id: number
}>

type HoldUpdateFields = Partial<{
  created_for_id: number
  customer_id: number
}>

type InvoiceUpdateFields = Partial<{
  organization_id: number
  invoice_type_id: number
  is_cleared: boolean
}>

type TransferUpdateFields = Partial<{
  origin_id: number
  destination_id: number
  transporter_id: number
}>

// ─── Base utilities (private) ─────────────────────────────────────────────────

async function recordHistory(
  entityType: HistoryEntityType,
  entityId: number,
  actionType: string,
  userId: number,
  changes: Record<string, unknown>
): Promise<void> {
  try {
    await prisma.history.create({
      data: {
        entity_type: entityType,
        entity_id: entityId,
        action_type: actionType,
        user_id: userId,
        changed_on: new Date(),
        changes: changes as Prisma.InputJsonValue
      }
    })
  } catch (error) {
    logger.error(`History write failed [${actionType} ${entityType} ${entityId}]`, { error })
  }
}

async function resolveArrivalNumber(id: number | null | undefined): Promise<string | null> {
  if (!id) return null
  const r = await prisma.arrival.findUnique({ where: { id }, select: { arrival_number: true } })
  return r?.arrival_number ?? null
}

async function resolveDepartureNumber(id: number | null | undefined): Promise<string | null> {
  if (!id) return null
  const r = await prisma.departure.findUnique({ where: { id }, select: { departure_number: true } })
  return r?.departure_number ?? null
}

async function resolveHoldNumber(id: number | null | undefined): Promise<string | null> {
  if (!id) return null
  const r = await prisma.hold.findUnique({ where: { id }, select: { hold_number: true } })
  return r?.hold_number ?? null
}

async function resolveInvoiceNumber(id: number | null | undefined): Promise<string | null> {
  if (!id) return null
  const r = await prisma.invoice.findUnique({ where: { id }, select: { invoice_number: true } })
  return r?.invoice_number ?? null
}

type LocationParts = { warehouse: string | null; zone: string | null; bin: string | null }

async function resolveLocationParts(id: number | null | undefined): Promise<LocationParts> {
  if (!id) return { warehouse: null, zone: null, bin: null }
  const r = await prisma.location.findUnique({
    where: { id },
    select: {
      bin: true,
      warehouse: { select: { city_code: true } },
      Zone: { select: { zone: true } }
    }
  })
  if (!r) return { warehouse: null, zone: null, bin: null }
  return {
    warehouse: r.warehouse?.city_code ?? null,
    zone: r.Zone?.zone ?? null,
    bin: r.bin ?? null
  }
}

async function resolveUserDiff(
  beforeId: number,
  afterId: number
): Promise<{ before: string | undefined; after: string | undefined }> {
  const [beforeUser, afterUser] = await Promise.all([
    prisma.user.findUnique({ where: { id: beforeId }, select: { name: true } }),
    prisma.user.findUnique({ where: { id: afterId }, select: { name: true } })
  ])
  return { before: beforeUser?.name, after: afterUser?.name }
}

async function resolveInvoiceTypeDiff(
  beforeId: number,
  afterId: number
): Promise<{ before: string | undefined; after: string | undefined }> {
  const [b, a] = await Promise.all([
    prisma.invoiceType.findUnique({ where: { id: beforeId }, select: { type: true } }),
    prisma.invoiceType.findUnique({ where: { id: afterId }, select: { type: true } })
  ])
  return { before: b?.type, after: a?.type }
}

async function resolveOrgDiff(
  beforeId: number,
  afterId: number
): Promise<{ before: string | undefined; after: string | undefined }> {
  const [beforeOrg, afterOrg] = await Promise.all([
    prisma.organization.findUnique({ where: { id: beforeId }, select: { name: true } }),
    prisma.organization.findUnique({ where: { id: afterId }, select: { name: true } })
  ])
  return { before: beforeOrg?.name, after: afterOrg?.name }
}

async function resolveWarehouseDiff(
  beforeId: number,
  afterId: number
): Promise<{ before: string | undefined; after: string | undefined }> {
  const [beforeWh, afterWh] = await Promise.all([
    prisma.warehouse.findUnique({ where: { id: beforeId }, select: { city_code: true } }),
    prisma.warehouse.findUnique({ where: { id: afterId }, select: { city_code: true } })
  ])
  return { before: beforeWh?.city_code, after: afterWh?.city_code }
}

// ─── Arrival ──────────────────────────────────────────────────────────────────

export async function recordArrivalCreate(
  arrivalId: number,
  state: ArrivalCreateState,
  userId: number
): Promise<void> {
  try {
    const [vendor, warehouse, user] = await Promise.all([
      prisma.organization.findUnique({ where: { id: state.origin_id }, select: { name: true } }),
      prisma.warehouse.findUnique({
        where: { id: state.destination_id },
        select: { city_code: true }
      }),
      prisma.user.findUnique({ where: { id: userId }, select: { name: true } })
    ])
    await recordHistory('Arrival', arrivalId, 'CREATE', userId, {
      after: {
        arrival_number: state.arrival_number,
        origin_name: vendor?.name,
        destination_city_code: warehouse?.city_code,
        created_by_name: user?.name,
        created_at: state.created_at
      }
    })
  } catch (error) {
    logger.error(`History write failed [CREATE Arrival ${arrivalId}]`, { error })
  }
}

export async function recordArrivalUpdate(
  arrivalId: number,
  before: ArrivalUpdateFields,
  after: ArrivalUpdateFields,
  userId: number
): Promise<void> {
  try {
    const diffBefore: Record<string, unknown> = {}
    const diffAfter: Record<string, unknown> = {}

    if (before.origin_id !== after.origin_id && before.origin_id && after.origin_id) {
      const org = await resolveOrgDiff(before.origin_id, after.origin_id)
      diffBefore.origin_name = org.before
      diffAfter.origin_name = org.after
    }

    if (before.destination_id !== after.destination_id && before.destination_id && after.destination_id) {
      const wh = await resolveWarehouseDiff(before.destination_id, after.destination_id)
      diffBefore.destination_city_code = wh.before
      diffAfter.destination_city_code = wh.after
    }

    if (before.transporter_id !== after.transporter_id && before.transporter_id && after.transporter_id) {
      const org = await resolveOrgDiff(before.transporter_id, after.transporter_id)
      diffBefore.transporter_name = org.before
      diffAfter.transporter_name = org.after
    }

    if (Object.keys(diffAfter).length > 0) {
      await recordHistory('Arrival', arrivalId, 'UPDATE', userId, { before: diffBefore, after: diffAfter })
    }
  } catch (error) {
    logger.error(`History write failed [UPDATE Arrival ${arrivalId}]`, { error })
  }
}

// ─── Asset ────────────────────────────────────────────────────────────────────

export async function recordAssetCreate(
  assetId: number,
  state: AssetCreateState,
  userId: number
): Promise<void> {
  try {
    const [model, arrival] = await Promise.all([
      prisma.model.findUnique({
        where: { id: state.model_id },
        select: { name: true, brand: { select: { name: true } } }
      }),
      state.arrival_id
        ? prisma.arrival.findUnique({
            where: { id: state.arrival_id },
            select: { arrival_number: true }
          })
        : Promise.resolve(null)
    ])
    await recordHistory('Asset', assetId, 'CREATE', userId, {
      after: {
        barcode: state.barcode,
        serial_number: state.serial_number,
        brand_name: model?.brand.name,
        model_name: model?.name,
        arrival_number: arrival?.arrival_number ?? null
      }
    })
  } catch (error) {
    logger.error(`History write failed [CREATE Asset ${assetId}]`, { error })
  }
}

export async function recordAssetUpdate(
  assetId: number,
  before: AssetUpdateFields,
  after: AssetUpdateFields,
  userId: number
): Promise<void> {
  try {
    const diffBefore: Record<string, unknown> = {}
    const diffAfter: Record<string, unknown> = {}

    if (before.arrival_id !== after.arrival_id) {
      const [beforeArrivalNumber, afterArrivalNumber] = await Promise.all([
        resolveArrivalNumber(before.arrival_id),
        resolveArrivalNumber(after.arrival_id)
      ])
      diffBefore.arrival_number = beforeArrivalNumber
      diffAfter.arrival_number = afterArrivalNumber
    }

    if (before.departure_id !== after.departure_id) {
      const [beforeDepartureNumber, afterDepartureNumber] = await Promise.all([
        resolveDepartureNumber(before.departure_id),
        resolveDepartureNumber(after.departure_id)
      ])
      diffBefore.departure_number = beforeDepartureNumber
      diffAfter.departure_number = afterDepartureNumber
    }

    if (before.hold_id !== after.hold_id) {
      const [beforeHoldNumber, afterHoldNumber] = await Promise.all([
        resolveHoldNumber(before.hold_id),
        resolveHoldNumber(after.hold_id)
      ])
      diffBefore.hold_number = beforeHoldNumber
      diffAfter.hold_number = afterHoldNumber
    }

    if (before.purchase_invoice_id !== after.purchase_invoice_id) {
      const [beforeInvoiceNumber, afterInvoiceNumber] = await Promise.all([
        resolveInvoiceNumber(before.purchase_invoice_id),
        resolveInvoiceNumber(after.purchase_invoice_id)
      ])
      diffBefore.invoice_number = beforeInvoiceNumber
      diffAfter.invoice_number = afterInvoiceNumber
    }

    if (before.location_id !== after.location_id) {
      const [beforeParts, afterParts] = await Promise.all([
        resolveLocationParts(before.location_id),
        resolveLocationParts(after.location_id)
      ])
      if (beforeParts.warehouse !== afterParts.warehouse) {
        diffBefore.warehouse = beforeParts.warehouse
        diffAfter.warehouse = afterParts.warehouse
      }
      if (beforeParts.zone !== afterParts.zone) {
        diffBefore.zone = beforeParts.zone
        diffAfter.zone = afterParts.zone
      }
      if (beforeParts.bin !== afterParts.bin) {
        diffBefore.bin = beforeParts.bin
        diffAfter.bin = afterParts.bin
      }
    }

    if (before.model_id !== after.model_id && before.model_id && after.model_id) {
      const [beforeModel, afterModel] = await Promise.all([
        prisma.model.findUnique({ where: { id: before.model_id }, select: { name: true } }),
        prisma.model.findUnique({ where: { id: after.model_id }, select: { name: true } })
      ])
      diffBefore.model_name = beforeModel?.name
      diffAfter.model_name = afterModel?.name
    }

    if (before.readiness_id !== after.readiness_id) {
      const [beforeStatus, afterStatus] = await Promise.all([
        before.readiness_id
          ? prisma.readiness.findUnique({
              where: { id: before.readiness_id },
              select: { status: true }
            })
          : null,
        after.readiness_id
          ? prisma.readiness.findUnique({
              where: { id: after.readiness_id },
              select: { status: true }
            })
          : null
      ])
      diffBefore.readiness = beforeStatus?.status ?? null
      diffAfter.readiness = afterStatus?.status ?? null
    }

    const plainFields = [
      'serial_number',
      'meter_black', 'meter_colour', 'meter_total',
      'cassettes', 'internal_finisher',
      'drum_life_c', 'drum_life_m', 'drum_life_y', 'drum_life_k',
      'toner_life_c', 'toner_life_m', 'toner_life_y', 'toner_life_k'
    ]
    for (const field of plainFields) {
      const beforeVal = (before as Record<string, unknown>)[field]
      const afterVal = (after as Record<string, unknown>)[field]
      if (beforeVal !== afterVal) {
        diffBefore[field] = beforeVal
        diffAfter[field] = afterVal
      }
    }

    if (JSON.stringify(before.error_ids) !== JSON.stringify(after.error_ids)) {
      const [beforeErrors, afterErrors] = await Promise.all([
        prisma.error.findMany({
          where: { id: { in: before.error_ids ?? [] } },
          select: { code: true }
        }),
        prisma.error.findMany({
          where: { id: { in: after.error_ids ?? [] } },
          select: { code: true }
        })
      ])
      diffBefore.error_codes = beforeErrors.map(e => e.code)
      diffAfter.error_codes = afterErrors.map(e => e.code)
    }

    if (Object.keys(diffAfter).length > 0) {
      await recordHistory('Asset', assetId, 'UPDATE', userId, { before: diffBefore, after: diffAfter })
    }

    const purchaseBefore: Record<string, unknown> = {}
    const purchaseAfter: Record<string, unknown> = {}
    for (const field of PURCHASE_COST_FIELDS) {
      if (before[field] !== after[field]) {
        purchaseBefore[field] = before[field]
        purchaseAfter[field] = after[field]
      }
    }
    if (Object.keys(purchaseAfter).length > 0) {
      await recordHistory('AssetPurchaseCost', assetId, 'UPDATE', userId, {
        before: purchaseBefore,
        after: purchaseAfter
      })
    }

    if (before.sale_price !== after.sale_price) {
      await recordHistory('AssetSalePrice', assetId, 'UPDATE', userId, {
        before: { sale_price: before.sale_price },
        after: { sale_price: after.sale_price }
      })
    }
  } catch (error) {
    logger.error(`History write failed [UPDATE Asset ${assetId}]`, { error })
  }
}

// ─── Departure ────────────────────────────────────────────────────────────────

export async function recordDepartureCreate(
  departureId: number,
  state: DepartureCreateState,
  userId: number
): Promise<void> {
  try {
    const [warehouse, customer, user] = await Promise.all([
      prisma.warehouse.findUnique({ where: { id: state.origin_id }, select: { city_code: true } }),
      prisma.organization.findUnique({
        where: { id: state.destination_id },
        select: { name: true }
      }),
      prisma.user.findUnique({ where: { id: userId }, select: { name: true } })
    ])
    await recordHistory('Departure', departureId, 'CREATE', userId, {
      after: {
        departure_number: state.departure_number,
        origin_city_code: warehouse?.city_code,
        destination_name: customer?.name,
        created_by_name: user?.name,
        created_at: state.created_at
      }
    })
  } catch (error) {
    logger.error(`History write failed [CREATE Departure ${departureId}]`, { error })
  }
}

export async function recordDepartureUpdate(
  departureId: number,
  before: DepartureUpdateFields,
  after: DepartureUpdateFields,
  userId: number
): Promise<void> {
  try {
    const diffBefore: Record<string, unknown> = {}
    const diffAfter: Record<string, unknown> = {}

    if (before.origin_id !== after.origin_id && before.origin_id && after.origin_id) {
      const wh = await resolveWarehouseDiff(before.origin_id, after.origin_id)
      diffBefore.origin_city_code = wh.before
      diffAfter.origin_city_code = wh.after
    }

    if (before.destination_id !== after.destination_id && before.destination_id && after.destination_id) {
      const org = await resolveOrgDiff(before.destination_id, after.destination_id)
      diffBefore.destination_name = org.before
      diffAfter.destination_name = org.after
    }

    if (before.transporter_id !== after.transporter_id && before.transporter_id && after.transporter_id) {
      const org = await resolveOrgDiff(before.transporter_id, after.transporter_id)
      diffBefore.transporter_name = org.before
      diffAfter.transporter_name = org.after
    }

    if (Object.keys(diffAfter).length > 0) {
      await recordHistory('Departure', departureId, 'UPDATE', userId, { before: diffBefore, after: diffAfter })
    }
  } catch (error) {
    logger.error(`History write failed [UPDATE Departure ${departureId}]`, { error })
  }
}

// ─── Hold ─────────────────────────────────────────────────────────────────────

export async function recordHoldCreate(
  holdId: number,
  state: HoldCreateState,
  userId: number
): Promise<void> {
  try {
    const [createdBy, createdFor, customer] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
      prisma.user.findUnique({ where: { id: state.created_for_id }, select: { name: true } }),
      prisma.organization.findUnique({ where: { id: state.customer_id }, select: { name: true } })
    ])
    await recordHistory('Hold', holdId, 'CREATE', userId, {
      after: {
        hold_number: state.hold_number,
        created_by_name: createdBy?.name,
        created_for_name: createdFor?.name,
        customer_name: customer?.name,
        created_at: state.created_at
      }
    })
  } catch (error) {
    logger.error(`History write failed [CREATE Hold ${holdId}]`, { error })
  }
}

export async function recordHoldUpdate(
  holdId: number,
  before: HoldUpdateFields,
  after: HoldUpdateFields,
  userId: number
): Promise<void> {
  try {
    const diffBefore: Record<string, unknown> = {}
    const diffAfter: Record<string, unknown> = {}

    if (before.created_for_id !== after.created_for_id && before.created_for_id && after.created_for_id) {
      const user = await resolveUserDiff(before.created_for_id, after.created_for_id)
      diffBefore.created_for_name = user.before
      diffAfter.created_for_name = user.after
    }

    if (before.customer_id !== after.customer_id && before.customer_id && after.customer_id) {
      const org = await resolveOrgDiff(before.customer_id, after.customer_id)
      diffBefore.customer_name = org.before
      diffAfter.customer_name = org.after
    }

    if (Object.keys(diffAfter).length > 0) {
      await recordHistory('Hold', holdId, 'UPDATE', userId, { before: diffBefore, after: diffAfter })
    }
  } catch (error) {
    logger.error(`History write failed [UPDATE Hold ${holdId}]`, { error })
  }
}

// ─── Invoice ──────────────────────────────────────────────────────────────────

export async function recordInvoiceCreate(
  invoiceId: number,
  state: InvoiceCreateState,
  userId: number
): Promise<void> {
  try {
    const [customer, invoiceType] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: state.organization_id },
        select: { name: true }
      }),
      prisma.invoiceType.findUnique({
        where: { id: state.invoice_type_id },
        select: { type: true }
      })
    ])
    await recordHistory('Invoice', invoiceId, 'CREATE', userId, {
      after: {
        invoice_number: state.invoice_number,
        customer_name: customer?.name,
        invoice_type: invoiceType?.type,
        created_at: state.created_at
      }
    })
  } catch (error) {
    logger.error(`History write failed [CREATE Invoice ${invoiceId}]`, { error })
  }
}

export async function recordInvoiceUpdate(
  invoiceId: number,
  before: InvoiceUpdateFields,
  after: InvoiceUpdateFields,
  userId: number
): Promise<void> {
  try {
    const diffBefore: Record<string, unknown> = {}
    const diffAfter: Record<string, unknown> = {}

    if (before.organization_id !== after.organization_id && before.organization_id && after.organization_id) {
      const org = await resolveOrgDiff(before.organization_id, after.organization_id)
      diffBefore.organization_name = org.before
      diffAfter.organization_name = org.after
    }

    if (before.invoice_type_id !== after.invoice_type_id && before.invoice_type_id && after.invoice_type_id) {
      const t = await resolveInvoiceTypeDiff(before.invoice_type_id, after.invoice_type_id)
      diffBefore.invoice_type = t.before
      diffAfter.invoice_type = t.after
    }

    if (before.is_cleared !== after.is_cleared) {
      diffBefore.is_cleared = before.is_cleared
      diffAfter.is_cleared = after.is_cleared
    }

    if (Object.keys(diffAfter).length > 0) {
      await recordHistory('Invoice', invoiceId, 'UPDATE', userId, { before: diffBefore, after: diffAfter })
    }
  } catch (error) {
    logger.error(`History write failed [UPDATE Invoice ${invoiceId}]`, { error })
  }
}

// ─── Transfer ─────────────────────────────────────────────────────────────────

export async function recordTransferCreate(
  transferId: number,
  state: TransferCreateState,
  userId: number
): Promise<void> {
  try {
    const [origin, destination, user] = await Promise.all([
      prisma.warehouse.findUnique({ where: { id: state.origin_id }, select: { city_code: true } }),
      prisma.warehouse.findUnique({
        where: { id: state.destination_id },
        select: { city_code: true }
      }),
      prisma.user.findUnique({ where: { id: userId }, select: { name: true } })
    ])
    await recordHistory('Transfer', transferId, 'CREATE', userId, {
      after: {
        transfer_number: state.transfer_number,
        origin_city_code: origin?.city_code,
        destination_city_code: destination?.city_code,
        created_by_name: user?.name,
        created_at: state.created_at
      }
    })
  } catch (error) {
    logger.error(`History write failed [CREATE Transfer ${transferId}]`, { error })
  }
}

export async function recordTransferUpdate(
  transferId: number,
  before: TransferUpdateFields,
  after: TransferUpdateFields,
  userId: number
): Promise<void> {
  try {
    const diffBefore: Record<string, unknown> = {}
    const diffAfter: Record<string, unknown> = {}

    if (before.origin_id !== after.origin_id && before.origin_id && after.origin_id) {
      const wh = await resolveWarehouseDiff(before.origin_id, after.origin_id)
      diffBefore.origin_city_code = wh.before
      diffAfter.origin_city_code = wh.after
    }

    if (before.destination_id !== after.destination_id && before.destination_id && after.destination_id) {
      const wh = await resolveWarehouseDiff(before.destination_id, after.destination_id)
      diffBefore.destination_city_code = wh.before
      diffAfter.destination_city_code = wh.after
    }

    if (before.transporter_id !== after.transporter_id && before.transporter_id && after.transporter_id) {
      const org = await resolveOrgDiff(before.transporter_id, after.transporter_id)
      diffBefore.transporter_name = org.before
      diffAfter.transporter_name = org.after
    }

    if (Object.keys(diffAfter).length > 0) {
      await recordHistory('Transfer', transferId, 'UPDATE', userId, { before: diffBefore, after: diffAfter })
    }
  } catch (error) {
    logger.error(`History write failed [UPDATE Transfer ${transferId}]`, { error })
  }
}

// ─── Collection asset membership ──────────────────────────────────────────────

export async function recordAssetUpdateOnCollection(
  entityType: HistoryEntityType,
  entityId: number,
  addedAssetIds: number[],
  removedAssetIds: number[],
  userId: number
): Promise<void> {
  try {
    const [addedBarcodes, removedBarcodes] = await Promise.all([
      addedAssetIds.length > 0
        ? prisma.asset.findMany({ where: { id: { in: addedAssetIds } }, select: { barcode: true } })
            .then(r => r.map(a => a.barcode))
        : Promise.resolve([] as string[]),
      removedAssetIds.length > 0
        ? prisma.asset.findMany({ where: { id: { in: removedAssetIds } }, select: { barcode: true } })
            .then(r => r.map(a => a.barcode))
        : Promise.resolve([] as string[])
    ])
    const writes: Promise<void>[] = []
    if (addedBarcodes.length > 0) {
      writes.push(recordHistory(entityType, entityId, 'ASSETS_ADDED', userId, { barcodes: addedBarcodes }))
    }
    if (removedBarcodes.length > 0) {
      writes.push(recordHistory(entityType, entityId, 'ASSETS_REMOVED', userId, { barcodes: removedBarcodes }))
    }
    await Promise.all(writes)
  } catch (error) {
    logger.error(`History write failed [ASSETS_CHANGED ${entityType} ${entityId}]`, { error })
  }
}

export async function recordBatchAssetUpdate<K extends keyof AssetUpdateFields>(
  assetIds: number[],
  field: K,
  beforeValue: AssetUpdateFields[K],
  afterValue: AssetUpdateFields[K],
  userId: number
): Promise<void> {
  if (assetIds.length === 0) return
  try {
    const diffBefore: Record<string, unknown> = {}
    const diffAfter: Record<string, unknown> = {}

    if (field === 'hold_id') {
      const [before, after] = await Promise.all([
        resolveHoldNumber(beforeValue as number | null),
        resolveHoldNumber(afterValue as number | null)
      ])
      diffBefore.hold_number = before
      diffAfter.hold_number = after
    } else if (field === 'arrival_id') {
      const [before, after] = await Promise.all([
        resolveArrivalNumber(beforeValue as number | null),
        resolveArrivalNumber(afterValue as number | null)
      ])
      diffBefore.arrival_number = before
      diffAfter.arrival_number = after
    } else if (field === 'departure_id') {
      const [before, after] = await Promise.all([
        resolveDepartureNumber(beforeValue as number | null),
        resolveDepartureNumber(afterValue as number | null)
      ])
      diffBefore.departure_number = before
      diffAfter.departure_number = after
    } else if (field === 'purchase_invoice_id') {
      const [before, after] = await Promise.all([
        resolveInvoiceNumber(beforeValue as number | null),
        resolveInvoiceNumber(afterValue as number | null)
      ])
      diffBefore.invoice_number = before
      diffAfter.invoice_number = after
    }

    if (Object.keys(diffAfter).length === 0) return

    const now = new Date()
    await prisma.history.createMany({
      data: assetIds.map(assetId => ({
        entity_type: 'Asset',
        entity_id: assetId,
        action_type: 'UPDATE',
        user_id: userId,
        changed_on: now,
        changes: { before: diffBefore, after: diffAfter } as Prisma.InputJsonValue
      }))
    })
  } catch (error) {
    logger.error(`History batch write failed [UPDATE Asset batch ${field}]`, { error })
  }
}

export async function recordBatchAssetCreate(
  assets: Array<{
    id: number
    barcode: string
    serial_number: string
    model_id: number
    arrival_id?: number | null
  }>,
  userId: number
): Promise<void> {
  if (assets.length === 0) return
  try {
    const uniqueModelIds = [...new Set(assets.map(a => a.model_id))]
    const uniqueArrivalIds = [
      ...new Set(assets.map(a => a.arrival_id).filter((id): id is number => !!id))
    ]
    const [models, arrivals] = await Promise.all([
      prisma.model.findMany({
        where: { id: { in: uniqueModelIds } },
        select: { id: true, name: true, brand: { select: { name: true } } }
      }),
      uniqueArrivalIds.length > 0
        ? prisma.arrival.findMany({
            where: { id: { in: uniqueArrivalIds } },
            select: { id: true, arrival_number: true }
          })
        : Promise.resolve([])
    ])
    const modelMap = new Map(models.map(m => [m.id, m]))
    const arrivalMap = new Map(arrivals.map(a => [a.id, a]))
    const now = new Date()
    await prisma.history.createMany({
      data: assets.map(asset => {
        const model = modelMap.get(asset.model_id)
        const arrival = asset.arrival_id ? arrivalMap.get(asset.arrival_id) : null
        return {
          entity_type: 'Asset',
          entity_id: asset.id,
          action_type: 'CREATE',
          user_id: userId,
          changed_on: now,
          changes: {
            after: {
              barcode: asset.barcode,
              serial_number: asset.serial_number,
              brand_name: model?.brand.name,
              model_name: model?.name,
              arrival_number: arrival?.arrival_number ?? null
            }
          } as Prisma.InputJsonValue
        }
      })
    })
  } catch (error) {
    logger.error(`History batch write failed [CREATE Asset batch]`, { error })
  }
}

export async function recordCollectionUpdateOnAssets<K extends keyof AssetUpdateFields>(
  assetIdsToRemove: number[],
  assetIdsToAdd: number[],
  field: K,
  value: AssetUpdateFields[K],
  userId: number
): Promise<void> {
  await recordBatchAssetUpdate(assetIdsToRemove, field, value, null as AssetUpdateFields[K], userId)
  await recordBatchAssetUpdate(assetIdsToAdd, field, null as AssetUpdateFields[K], value, userId)
}

export async function getCollectionHistory(
  entityType: HistoryEntityType,
  entityId: number
): Promise<CollectionHistory> {
  const rows = await prisma.history.findMany({
    where: { entity_type: entityType, entity_id: entityId },
    include: { User: { select: { name: true } } },
    orderBy: { changed_on: 'desc' }
  })
  return rows.map(row => ({
    action_type: row.action_type as CollectionHistoryRecord['action_type'],
    user_name: row.User.name,
    changed_on: row.changed_on,
    changes: row.changes
  })) as CollectionHistory
}
