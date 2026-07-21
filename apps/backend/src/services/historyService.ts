import { CollectionHistory, CollectionHistoryRecord } from 'shared-types'
import { Prisma } from '../../generated/prisma/client.js'
import { logger } from '../lib/logger.js'
import { prisma } from '../prisma.js'

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
  invoice_reference: string
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
  sales_invoice_id: number | null
  location_id: number | null
  model_id: number
  serial_number: string
  status_id: number
  readiness_id: number
  country_of_origin_id: number | null
  manufactured_year: number | null
  meter_black: number | null
  meter_colour: number | null
  meter_total: number | null
  cassettes: number | null
  component_id: number | null
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
  'total_cost',
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
  is_cleared: boolean
}>

type TransferUpdateFields = Partial<{
  status: string
  origin_id: number
  destination_id: number
  transporter_id: number
}>

// ─── Base utility ─────────────────────────────────────────────────────────────

async function recordHistory(
  entityType: HistoryEntityType,
  entityId: number,
  actionType: string,
  userId: number,
  changes: Record<string, unknown>,
): Promise<void> {
  try {
    await prisma.history.create({
      data: {
        entity_type: entityType,
        entity_id: entityId,
        action_type: actionType,
        user_id: userId,
        changed_on: new Date(),
        changes: changes as Prisma.InputJsonValue,
      },
    })
  } catch (error) {
    logger.error(`History write failed [${actionType} ${entityType} ${entityId}]`, { error })
  }
}

// ─── FK label resolution ──────────────────────────────────────────────────────
//
// Each resolver turns a set of ids for one referenced table into an id→label Map
// in a single batched query. Replaces the per-field two-row lookups.

function foreignKeyResolver<T extends { id: number }>(
  findMany: (ids: number[]) => Promise<T[]>,
  label: (row: T) => string | null,
): (ids: Array<number | null | undefined>) => Promise<Map<number, string | null>> {
  return async (ids) => {
    const unique = [...new Set(ids.filter((x): x is number => x != null))]
    if (unique.length === 0) return new Map()
    const rows = await findMany(unique)
    return new Map(rows.map((row) => [row.id, label(row)]))
  }
}

const RESOLVERS = {
  arrival: foreignKeyResolver(
    (ids) =>
      prisma.arrival.findMany({
        where: { id: { in: ids } },
        select: { id: true, arrival_number: true },
      }),
    (r) => r.arrival_number,
  ),
  departure: foreignKeyResolver(
    (ids) =>
      prisma.departure.findMany({
        where: { id: { in: ids } },
        select: { id: true, departure_number: true },
      }),
    (r) => r.departure_number,
  ),
  hold: foreignKeyResolver(
    (ids) =>
      prisma.hold.findMany({ where: { id: { in: ids } }, select: { id: true, hold_number: true } }),
    (r) => r.hold_number,
  ),
  invoice: foreignKeyResolver(
    (ids) =>
      prisma.invoice.findMany({
        where: { id: { in: ids } },
        select: { id: true, invoice_number: true },
      }),
    (r) => r.invoice_number,
  ),
  organization: foreignKeyResolver(
    (ids) =>
      prisma.organization.findMany({
        where: { id: { in: ids } },
        select: { id: true, name: true },
      }),
    (r) => r.name,
  ),
  warehouse: foreignKeyResolver(
    (ids) =>
      prisma.warehouse.findMany({
        where: { id: { in: ids } },
        select: { id: true, city_code: true },
      }),
    (r) => r.city_code,
  ),
  model: foreignKeyResolver(
    (ids) =>
      prisma.model.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }),
    (r) => r.name,
  ),
  readiness: foreignKeyResolver(
    (ids) =>
      prisma.readiness.findMany({ where: { id: { in: ids } }, select: { id: true, status: true } }),
    (r) => r.status,
  ),
  status: foreignKeyResolver(
    (ids) =>
      prisma.status.findMany({ where: { id: { in: ids } }, select: { id: true, status: true } }),
    (r) => r.status,
  ),
  country: foreignKeyResolver(
    (ids) =>
      prisma.country.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }),
    (r) => r.name,
  ),
  component: foreignKeyResolver(
    (ids) =>
      prisma.component.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }),
    (r) => r.name,
  ),
  invoiceType: foreignKeyResolver(
    (ids) =>
      prisma.invoiceType.findMany({ where: { id: { in: ids } }, select: { id: true, type: true } }),
    (r) => r.type,
  ),
  user: foreignKeyResolver(
    (ids) => prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }),
    (r) => r.name,
  ),
}

type ResolverKey = keyof typeof RESOLVERS

type LocationParts = { warehouse: string | null; zone: string | null; bin: string | null }

async function resolveLocationParts(id: number | null | undefined): Promise<LocationParts> {
  if (!id) return { warehouse: null, zone: null, bin: null }
  const r = await prisma.location.findUnique({
    where: { id },
    select: {
      bin: true,
      warehouse: { select: { city_code: true } },
      zone: { select: { zone: true } },
    },
  })
  if (!r) return { warehouse: null, zone: null, bin: null }
  return {
    warehouse: r.warehouse?.city_code ?? null,
    zone: r.zone?.zone ?? null,
    bin: r.bin ?? null,
  }
}

async function resolveErrorCodes(ids: number[] | undefined): Promise<string[]> {
  const rows = await prisma.error.findMany({
    where: { id: { in: ids ?? [] } },
    select: { code: true },
  })
  return rows.map((e) => e.code)
}

// ─── UPDATE engine ────────────────────────────────────────────────────────────
//
// A FieldSpec declares one tracked field; one engine walks the spec, resolves
// labels, and writes one history row per non-empty permission channel.

type Channel = 'asset' | 'purchaseCost' | 'salePrice'

type FieldSpec = {
  field: string
  out?: string // output label; defaults to `field`
  resolve?: ResolverKey // FK → human label
  expand?: 'location' // one id → warehouse/zone/bin
  array?: 'errorCodes' // error_ids → error_codes
  bothRequired?: boolean // only record when before & after both truthy
  channel?: Channel // default 'asset'
}

type Bucket = { before: Record<string, unknown>; after: Record<string, unknown> }

const CHANNEL_ENTITY: Record<Exclude<Channel, 'asset'>, HistoryEntityType> = {
  purchaseCost: 'AssetPurchaseCost',
  salePrice: 'AssetSalePrice',
}

function emptyBuckets(): Record<Channel, Bucket> {
  return {
    asset: { before: {}, after: {} },
    purchaseCost: { before: {}, after: {} },
    salePrice: { before: {}, after: {} },
  }
}

async function applyLocationExpand(before: unknown, after: unknown, bucket: Bucket): Promise<void> {
  if (before === after) return
  const [bp, ap] = await Promise.all([
    resolveLocationParts(before as number | null | undefined),
    resolveLocationParts(after as number | null | undefined),
  ])
  if (bp.warehouse !== ap.warehouse) {
    bucket.before.warehouse = bp.warehouse
    bucket.after.warehouse = ap.warehouse
  }
  if (bp.zone !== ap.zone) {
    bucket.before.zone = bp.zone
    bucket.after.zone = ap.zone
  }
  if (bp.bin !== ap.bin) {
    bucket.before.bin = bp.bin
    bucket.after.bin = ap.bin
  }
}

async function applyErrorCodesArray(
  spec: FieldSpec,
  before: unknown,
  after: unknown,
  bucket: Bucket,
): Promise<void> {
  if (JSON.stringify(before) === JSON.stringify(after)) return
  const [bc, ac] = await Promise.all([
    resolveErrorCodes(before as number[] | undefined),
    resolveErrorCodes(after as number[] | undefined),
  ])
  bucket.before[spec.out ?? spec.field] = bc
  bucket.after[spec.out ?? spec.field] = ac
}

async function applySpec(
  spec: FieldSpec,
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  buckets: Record<Channel, Bucket>,
): Promise<void> {
  const bucket = buckets[spec.channel ?? 'asset']
  const b = before[spec.field]
  const a = after[spec.field]

  if (spec.expand === 'location') return applyLocationExpand(b, a, bucket)
  if (spec.array === 'errorCodes') return applyErrorCodesArray(spec, b, a, bucket)

  if (b === a) return
  if (spec.bothRequired && (!b || !a)) return

  const out = spec.out ?? spec.field
  if (spec.resolve) {
    const map = await RESOLVERS[spec.resolve]([b, a] as Array<number | null | undefined>)
    bucket.before[out] = b == null ? null : (map.get(b as number) ?? null)
    bucket.after[out] = a == null ? null : (map.get(a as number) ?? null)
    return
  }

  bucket.before[out] = b
  bucket.after[out] = a
}

async function recordUpdate(
  entityType: HistoryEntityType,
  entityId: number,
  specs: FieldSpec[],
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  userId: number,
): Promise<void> {
  try {
    const buckets = emptyBuckets()
    for (const spec of specs) {
      await applySpec(spec, before, after, buckets)
    }
    const channels: Channel[] = ['asset', 'purchaseCost', 'salePrice']
    for (const channel of channels) {
      const { before: diffBefore, after: diffAfter } = buckets[channel]
      if (Object.keys(diffAfter).length === 0) continue
      const target = channel === 'asset' ? entityType : CHANNEL_ENTITY[channel]
      await recordHistory(target, entityId, 'UPDATE', userId, {
        before: diffBefore,
        after: diffAfter,
      })
    }
  } catch (error) {
    logger.error(`History write failed [UPDATE ${entityType} ${entityId}]`, { error })
  }
}

// ─── CREATE engine ────────────────────────────────────────────────────────────

type CreateFieldSpec<S> =
  | { out: string; value: (state: S, userId: number) => unknown }
  | {
      out: string
      resolve: ResolverKey
      id: (state: S, userId: number) => number | null | undefined
    }

async function recordCreate<S>(
  entityType: HistoryEntityType,
  entityId: number,
  userId: number,
  state: S,
  specs: CreateFieldSpec<S>[],
): Promise<void> {
  try {
    const idsByKey = new Map<ResolverKey, number[]>()
    for (const spec of specs) {
      if (!('resolve' in spec)) continue
      const id = spec.id(state, userId)
      if (id == null) continue
      idsByKey.set(spec.resolve, [...(idsByKey.get(spec.resolve) ?? []), id])
    }
    const resolved = new Map<ResolverKey, Map<number, string | null>>()
    await Promise.all(
      [...idsByKey].map(async ([key, ids]) => {
        resolved.set(key, await RESOLVERS[key](ids))
      }),
    )

    const after: Record<string, unknown> = {}
    for (const spec of specs) {
      if ('value' in spec) {
        after[spec.out] = spec.value(state, userId)
      } else {
        const id = spec.id(state, userId)
        after[spec.out] = id == null ? null : (resolved.get(spec.resolve)?.get(id) ?? null)
      }
    }
    await recordHistory(entityType, entityId, 'CREATE', userId, { after })
  } catch (error) {
    logger.error(`History write failed [CREATE ${entityType} ${entityId}]`, { error })
  }
}

// ─── Per-entity field specs ───────────────────────────────────────────────────

const ASSET_PLAIN_FIELDS = [
  'serial_number',
  'manufactured_year',
  'meter_black',
  'meter_colour',
  'meter_total',
  'cassettes',
  'drum_life_c',
  'drum_life_m',
  'drum_life_y',
  'drum_life_k',
  'toner_life_c',
  'toner_life_m',
  'toner_life_y',
  'toner_life_k',
]

const ASSET_UPDATE_SPEC: FieldSpec[] = [
  { field: 'arrival_id', out: 'arrival_number', resolve: 'arrival' },
  { field: 'departure_id', out: 'departure_number', resolve: 'departure' },
  { field: 'hold_id', out: 'hold_number', resolve: 'hold' },
  { field: 'purchase_invoice_id', out: 'invoice_number', resolve: 'invoice' },
  { field: 'sales_invoice_id', out: 'invoice_number', resolve: 'invoice' },
  { field: 'location_id', expand: 'location' },
  { field: 'model_id', out: 'model_name', resolve: 'model', bothRequired: true },
  { field: 'status_id', out: 'status', resolve: 'status' },
  { field: 'readiness_id', out: 'readiness', resolve: 'readiness' },
  { field: 'country_of_origin_id', out: 'country_of_origin', resolve: 'country' },
  { field: 'component_id', out: 'internal_finisher', resolve: 'component' },
  ...ASSET_PLAIN_FIELDS.map((field): FieldSpec => ({ field })),
  { field: 'error_ids', out: 'error_codes', array: 'errorCodes' },
  ...PURCHASE_COST_FIELDS.map((field): FieldSpec => ({ field, channel: 'purchaseCost' })),
  { field: 'sale_price', channel: 'salePrice' },
]

const ARRIVAL_UPDATE_SPEC: FieldSpec[] = [
  { field: 'origin_id', out: 'origin_name', resolve: 'organization', bothRequired: true },
  {
    field: 'destination_id',
    out: 'destination_city_code',
    resolve: 'warehouse',
    bothRequired: true,
  },
  { field: 'transporter_id', out: 'transporter_name', resolve: 'organization', bothRequired: true },
]

const DEPARTURE_UPDATE_SPEC: FieldSpec[] = [
  { field: 'origin_id', out: 'origin_city_code', resolve: 'warehouse', bothRequired: true },
  { field: 'destination_id', out: 'destination_name', resolve: 'organization', bothRequired: true },
  { field: 'transporter_id', out: 'transporter_name', resolve: 'organization', bothRequired: true },
]

const HOLD_UPDATE_SPEC: FieldSpec[] = [
  { field: 'created_for_id', out: 'created_for_name', resolve: 'user', bothRequired: true },
  { field: 'customer_id', out: 'customer_name', resolve: 'organization', bothRequired: true },
]

const INVOICE_UPDATE_SPEC: FieldSpec[] = [
  {
    field: 'organization_id',
    out: 'organization_name',
    resolve: 'organization',
    bothRequired: true,
  },
  { field: 'is_cleared' },
]

const TRANSFER_UPDATE_SPEC: FieldSpec[] = [
  { field: 'status' },
  { field: 'origin_id', out: 'origin_city_code', resolve: 'warehouse', bothRequired: true },
  {
    field: 'destination_id',
    out: 'destination_city_code',
    resolve: 'warehouse',
    bothRequired: true,
  },
  { field: 'transporter_id', out: 'transporter_name', resolve: 'organization', bothRequired: true },
]

const ARRIVAL_CREATE_SPEC: CreateFieldSpec<ArrivalCreateState>[] = [
  { out: 'arrival_number', value: (s) => s.arrival_number },
  { out: 'origin_name', resolve: 'organization', id: (s) => s.origin_id },
  { out: 'destination_city_code', resolve: 'warehouse', id: (s) => s.destination_id },
  { out: 'created_by_name', resolve: 'user', id: (_, userId) => userId },
  { out: 'created_at', value: (s) => s.created_at },
]

const DEPARTURE_CREATE_SPEC: CreateFieldSpec<DepartureCreateState>[] = [
  { out: 'departure_number', value: (s) => s.departure_number },
  { out: 'origin_city_code', resolve: 'warehouse', id: (s) => s.origin_id },
  { out: 'destination_name', resolve: 'organization', id: (s) => s.destination_id },
  { out: 'created_by_name', resolve: 'user', id: (_, userId) => userId },
  { out: 'created_at', value: (s) => s.created_at },
]

const HOLD_CREATE_SPEC: CreateFieldSpec<HoldCreateState>[] = [
  { out: 'hold_number', value: (s) => s.hold_number },
  { out: 'created_by_name', resolve: 'user', id: (_, userId) => userId },
  { out: 'created_for_name', resolve: 'user', id: (s) => s.created_for_id },
  { out: 'customer_name', resolve: 'organization', id: (s) => s.customer_id },
  { out: 'created_at', value: (s) => s.created_at },
]

const INVOICE_CREATE_SPEC: CreateFieldSpec<InvoiceCreateState>[] = [
  { out: 'invoice_number', value: (s) => s.invoice_number },
  { out: 'invoice_reference', value: (s) => s.invoice_reference },
  { out: 'customer_name', resolve: 'organization', id: (s) => s.organization_id },
  { out: 'invoice_type', resolve: 'invoiceType', id: (s) => s.invoice_type_id },
  { out: 'created_at', value: (s) => s.created_at },
]

const TRANSFER_CREATE_SPEC: CreateFieldSpec<TransferCreateState>[] = [
  { out: 'transfer_number', value: (s) => s.transfer_number },
  { out: 'origin_city_code', resolve: 'warehouse', id: (s) => s.origin_id },
  { out: 'destination_city_code', resolve: 'warehouse', id: (s) => s.destination_id },
  { out: 'created_by_name', resolve: 'user', id: (_, userId) => userId },
  { out: 'created_at', value: (s) => s.created_at },
]

// ─── Public API: per-entity wrappers ──────────────────────────────────────────

export async function recordArrivalCreate(
  arrivalId: number,
  state: ArrivalCreateState,
  userId: number,
): Promise<void> {
  return recordCreate('Arrival', arrivalId, userId, state, ARRIVAL_CREATE_SPEC)
}

export async function recordArrivalUpdate(
  arrivalId: number,
  before: ArrivalUpdateFields,
  after: ArrivalUpdateFields,
  userId: number,
): Promise<void> {
  return recordUpdate('Arrival', arrivalId, ARRIVAL_UPDATE_SPEC, before, after, userId)
}

export async function recordDepartureCreate(
  departureId: number,
  state: DepartureCreateState,
  userId: number,
): Promise<void> {
  return recordCreate('Departure', departureId, userId, state, DEPARTURE_CREATE_SPEC)
}

export async function recordDepartureUpdate(
  departureId: number,
  before: DepartureUpdateFields,
  after: DepartureUpdateFields,
  userId: number,
): Promise<void> {
  return recordUpdate('Departure', departureId, DEPARTURE_UPDATE_SPEC, before, after, userId)
}

export async function recordHoldCreate(
  holdId: number,
  state: HoldCreateState,
  userId: number,
): Promise<void> {
  return recordCreate('Hold', holdId, userId, state, HOLD_CREATE_SPEC)
}

export async function recordHoldUpdate(
  holdId: number,
  before: HoldUpdateFields,
  after: HoldUpdateFields,
  userId: number,
): Promise<void> {
  return recordUpdate('Hold', holdId, HOLD_UPDATE_SPEC, before, after, userId)
}

export async function recordHoldArchive(
  holdId: number,
  archivedAt: Date,
  userId: number,
): Promise<void> {
  await recordHistory('Hold', holdId, 'UPDATE', userId, {
    before: { archived_at: null },
    after: { archived_at: archivedAt },
  })
}

export async function recordInvoiceCreate(
  invoiceId: number,
  state: InvoiceCreateState,
  userId: number,
): Promise<void> {
  return recordCreate('Invoice', invoiceId, userId, state, INVOICE_CREATE_SPEC)
}

export async function recordInvoiceUpdate(
  invoiceId: number,
  before: InvoiceUpdateFields,
  after: InvoiceUpdateFields,
  userId: number,
): Promise<void> {
  return recordUpdate('Invoice', invoiceId, INVOICE_UPDATE_SPEC, before, after, userId)
}

export async function recordTransferCreate(
  transferId: number,
  state: TransferCreateState,
  userId: number,
): Promise<void> {
  return recordCreate('Transfer', transferId, userId, state, TRANSFER_CREATE_SPEC)
}

export async function recordTransferUpdate(
  transferId: number,
  before: TransferUpdateFields,
  after: TransferUpdateFields,
  userId: number,
): Promise<void> {
  return recordUpdate('Transfer', transferId, TRANSFER_UPDATE_SPEC, before, after, userId)
}

export async function recordAssetUpdate(
  assetId: number,
  before: AssetUpdateFields,
  after: AssetUpdateFields,
  userId: number,
): Promise<void> {
  return recordUpdate('Asset', assetId, ASSET_UPDATE_SPEC, before, after, userId)
}

export async function recordBatchAssetCreate(
  assets: Array<{
    id: number
    barcode: string
    serial_number: string
    model_id: number
    arrival_id?: number | null
  }>,
  userId: number,
): Promise<void> {
  if (assets.length === 0) return
  try {
    const uniqueModelIds = [...new Set(assets.map((a) => a.model_id))]
    const uniqueArrivalIds = [
      ...new Set(assets.map((a) => a.arrival_id).filter((id): id is number => !!id)),
    ]
    const [models, arrivals] = await Promise.all([
      prisma.model.findMany({
        where: { id: { in: uniqueModelIds } },
        select: { id: true, name: true, brand: { select: { name: true } } },
      }),
      uniqueArrivalIds.length > 0
        ? prisma.arrival.findMany({
            where: { id: { in: uniqueArrivalIds } },
            select: { id: true, arrival_number: true },
          })
        : Promise.resolve([]),
    ])
    const modelMap = new Map(models.map((m) => [m.id, m]))
    const arrivalMap = new Map(arrivals.map((a) => [a.id, a]))
    const now = new Date()
    await prisma.history.createMany({
      data: assets.map((asset) => {
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
              arrival_number: arrival?.arrival_number ?? null,
            },
          } as Prisma.InputJsonValue,
        }
      }),
    })
  } catch (error) {
    logger.error(`History batch write failed [CREATE Asset batch]`, { error })
  }
}

// ─── Collection asset membership + batched asset updates ──────────────────────

export async function recordAssetUpdateOnCollection(
  entityType: HistoryEntityType,
  entityId: number,
  addedAssetIds: number[],
  removedAssetIds: number[],
  userId: number,
): Promise<void> {
  try {
    const [addedBarcodes, removedBarcodes] = await Promise.all([
      addedAssetIds.length > 0
        ? prisma.asset
            .findMany({ where: { id: { in: addedAssetIds } }, select: { barcode: true } })
            .then((r) => r.map((a) => a.barcode))
        : Promise.resolve([] as string[]),
      removedAssetIds.length > 0
        ? prisma.asset
            .findMany({ where: { id: { in: removedAssetIds } }, select: { barcode: true } })
            .then((r) => r.map((a) => a.barcode))
        : Promise.resolve([] as string[]),
    ])
    const writes: Promise<void>[] = []
    if (addedBarcodes.length > 0) {
      writes.push(
        recordHistory(entityType, entityId, 'ASSETS_ADDED', userId, { barcodes: addedBarcodes }),
      )
    }
    if (removedBarcodes.length > 0) {
      writes.push(
        recordHistory(entityType, entityId, 'ASSETS_REMOVED', userId, {
          barcodes: removedBarcodes,
        }),
      )
    }
    await Promise.all(writes)
  } catch (error) {
    logger.error(`History write failed [ASSETS_CHANGED ${entityType} ${entityId}]`, { error })
  }
}

async function recordBatchAssetUpdate<K extends keyof AssetUpdateFields>(
  assetIds: number[],
  field: K,
  beforeValue: AssetUpdateFields[K],
  afterValue: AssetUpdateFields[K],
  userId: number,
): Promise<void> {
  if (assetIds.length === 0) return
  try {
    const spec = ASSET_UPDATE_SPEC.find((s) => s.field === field)
    if (!spec) return
    const buckets = emptyBuckets()
    await applySpec(spec, { [field]: beforeValue }, { [field]: afterValue }, buckets)
    const { before: diffBefore, after: diffAfter } = buckets.asset
    if (Object.keys(diffAfter).length === 0) return

    const now = new Date()
    await prisma.history.createMany({
      data: assetIds.map((assetId) => ({
        entity_type: 'Asset',
        entity_id: assetId,
        action_type: 'UPDATE',
        user_id: userId,
        changed_on: now,
        changes: { before: diffBefore, after: diffAfter } as Prisma.InputJsonValue,
      })),
    })
  } catch (error) {
    logger.error(`History batch write failed [UPDATE Asset batch ${String(field)}]`, { error })
  }
}

// Records a status transition for a set of assets that share one new status but
// may have had different prior statuses. Best-effort, call outside the transaction.
export async function recordAssetStatusChange(
  priorAssets: Array<{ id: number; status_id: number }>,
  newStatusId: number,
  userId: number,
): Promise<void> {
  const assetsByPriorStatus = Object.groupBy(priorAssets, (asset) => asset.status_id)
  for (const [priorStatusId, assets] of Object.entries(assetsByPriorStatus)) {
    if (!assets) continue
    await recordBatchAssetUpdate(
      assets.map((asset) => asset.id),
      'status_id',
      Number(priorStatusId),
      newStatusId,
      userId,
    )
  }
}

export async function recordCollectionUpdateOnAssets<K extends keyof AssetUpdateFields>(
  assetIdsToRemove: number[],
  assetIdsToAdd: number[],
  field: K,
  value: AssetUpdateFields[K],
  userId: number,
): Promise<void> {
  await recordBatchAssetUpdate(assetIdsToRemove, field, value, null as AssetUpdateFields[K], userId)
  await recordBatchAssetUpdate(assetIdsToAdd, field, null as AssetUpdateFields[K], value, userId)
}

export async function recordCollectionMoveOnAssets<K extends keyof AssetUpdateFields>(
  assetIds: number[],
  field: K,
  fromValue: AssetUpdateFields[K],
  toValue: AssetUpdateFields[K],
  userId: number,
): Promise<void> {
  await recordBatchAssetUpdate(assetIds, field, fromValue, toValue, userId)
}

export async function getCollectionHistory(
  entityType: HistoryEntityType,
  entityId: number,
): Promise<CollectionHistory> {
  const rows = await prisma.history.findMany({
    where: { entity_type: entityType, entity_id: entityId },
    include: { user: { select: { name: true } } },
    orderBy: { changed_on: 'desc' },
  })
  return rows.map((row) => ({
    action_type: row.action_type as CollectionHistoryRecord['action_type'],
    user_name: row.user.name,
    changed_on: row.changed_on,
    changes: row.changes,
  })) as CollectionHistory
}
