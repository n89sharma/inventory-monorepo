import { AssetDetails, AssetLocationDetails, AssetSearchRow, AssetSummary } from 'shared-types'
import type { Prisma } from '../../generated/prisma/client.js'
import { getAssetDetailsBatch as getAssetDetailsBatchQuery } from '../../generated/prisma/sql.js'
import { decimalToNumber } from './decimal.js'

type LocationRow = {
  warehouse_id: number | null
  warehouse_code: string | null
  warehouse_street: string | null
  zone: string | null
  bin: string | null
}

function buildLocation(r: LocationRow): AssetLocationDetails | null {
  if (r.warehouse_id === null || !r.warehouse_code || !r.warehouse_street || !r.zone) return null
  return {
    warehouse_id: r.warehouse_id,
    warehouse_code: r.warehouse_code,
    warehouse_street: r.warehouse_street,
    zone: r.zone,
    bin: r.bin ?? '',
  }
}

type AssetSummaryRow = LocationRow & {
  id: number
  barcode: string
  brand: string
  model: string
  asset_type: string
  serial_number: string
  meter_total: number | null
  cassettes: number | null
  internal_finisher: string | null
  accessories: string[] | null
  weight: number
  size: number
  status: string
  readiness: string
  hold_number?: string | null
  purchase_invoice_number: string | null
  sales_invoice_number: string | null
  is_in_transit: boolean
  created_at: Date
}

export function mapAssetSummary(r: AssetSummaryRow): AssetSummary {
  return {
    id: r.id,
    barcode: r.barcode,
    brand: r.brand,
    model: r.model,
    asset_type: r.asset_type,
    serial_number: r.serial_number,
    meter_total: r.meter_total,
    cassettes: r.cassettes,
    internal_finisher: r.internal_finisher,
    accessories: r.accessories ?? [],
    weight: r.weight,
    size: r.size,
    status: r.status,
    readiness: r.readiness,
    location: buildLocation(r),
    hold_number: r.hold_number ?? null,
    purchase_invoice_number: r.purchase_invoice_number,
    sales_invoice_number: r.sales_invoice_number,
    is_in_transit: r.is_in_transit,
    created_at: r.created_at,
  }
}

type AssetSearchRowDb = LocationRow & {
  id: number
  barcode: string
  brand: string
  model: string
  asset_type: string
  serial_number: string
  status: string
  readiness: string
  is_in_transit: boolean
  created_at: Date
  country_of_origin: string | null
  manufactured_year: number | null
  weight: number
  size: number
  specs_meter_total: number | null
  specs_cassettes: number | null
  specs_internal_finisher: string | null
  specs_toner_life_c: number | null
  specs_toner_life_m: number | null
  specs_toner_life_y: number | null
  specs_toner_life_k: number | null
  cost_purchase_cost: Prisma.Decimal | null
  cost_transport_cost: Prisma.Decimal | null
  cost_processing_cost: Prisma.Decimal | null
  cost_total_cost: Prisma.Decimal | null
  cost_sale_price: Prisma.Decimal | null
  hold_hold_number: string | null
  held_by: string | null
  hold_created_for: string | null
  hold_customer: string | null
  hold_created_at: Date | null
  vendor: string | null
  customer: string | null
  departed_at: Date | null
  arrival_created_at: Date | null
  purchase_invoice_invoice_number: string | null
  latest_comment: string | null
  latest_comment_by: string | null
  latest_comment_at: Date | null
}

export function mapAssetSearchRow(r: AssetSearchRowDb): AssetSearchRow {
  return {
    id: r.id,
    barcode: r.barcode,
    brand: r.brand,
    model: r.model,
    asset_type: r.asset_type,
    serial_number: r.serial_number,
    status: r.status,
    readiness: r.readiness,
    location: buildLocation(r),
    is_in_transit: r.is_in_transit,
    created_at: r.created_at,
    country_of_origin: r.country_of_origin,
    manufactured_year: r.manufactured_year,
    weight: r.weight,
    size: r.size,
    specs_meter_total: r.specs_meter_total,
    specs_cassettes: r.specs_cassettes,
    specs_internal_finisher: r.specs_internal_finisher,
    specs_toner_life_c: r.specs_toner_life_c,
    specs_toner_life_m: r.specs_toner_life_m,
    specs_toner_life_y: r.specs_toner_life_y,
    specs_toner_life_k: r.specs_toner_life_k,
    cost_purchase_cost: decimalToNumber(r.cost_purchase_cost),
    cost_transport_cost: decimalToNumber(r.cost_transport_cost),
    cost_processing_cost: decimalToNumber(r.cost_processing_cost),
    cost_total_cost: decimalToNumber(r.cost_total_cost),
    cost_sale_price: decimalToNumber(r.cost_sale_price),
    hold_hold_number: r.hold_hold_number,
    held_by: r.held_by,
    hold_created_for: r.hold_created_for,
    hold_customer: r.hold_customer,
    hold_created_at: r.hold_created_at,
    vendor: r.vendor,
    customer: r.customer,
    departed_at: r.departed_at,
    arrival_created_at: r.arrival_created_at,
    purchase_invoice_invoice_number: r.purchase_invoice_invoice_number,
    latest_comment: r.latest_comment,
    latest_comment_by: r.latest_comment_by,
    latest_comment_at: r.latest_comment_at,
  }
}

type AssetDetailRow = getAssetDetailsBatchQuery.Result

export function mapAssetDetail(r: AssetDetailRow): AssetDetails {
  return {
    id: r.id!,
    barcode: r.barcode!,
    serial_number: r.serial_number!,
    model: r.model!,
    is_colour: r.is_colour!,
    brand: r.brand!,
    brand_id: r.brand_id!,
    asset_type: r.asset_type!,
    status: r.status!,
    readiness: r.readiness!,
    is_in_transit: r.is_in_transit!,
    country_of_origin: r.country_of_origin,
    country_of_origin_id: r.country_of_origin_id,
    manufactured_year: r.manufactured_year,
    weight: r.weight!,
    size: r.size!,
    location: buildLocation(r),
    cost: {
      purchase_cost: r.purchase_cost?.toNumber() ?? null,
      transport_cost: r.transport_cost?.toNumber() ?? null,
      processing_cost: r.processing_cost?.toNumber() ?? null,
      other_cost: r.other_cost?.toNumber() ?? null,
      parts_cost: r.parts_cost?.toNumber() ?? null,
      total_cost: r.total_cost?.toNumber() ?? null,
      sale_price: r.sale_price?.toNumber() ?? null,
    },
    specs: {
      cassettes: r.ts_cassettes,
      internal_finisher: r.internal_finisher,
      internal_finisher_id: r.internal_finisher_id,
      meter_black: r.meter_black,
      meter_colour: r.meter_colour,
      meter_total: r.meter_total,
      drum_life_c: r.drum_life_c,
      drum_life_m: r.drum_life_m,
      drum_life_y: r.drum_life_y,
      drum_life_k: r.drum_life_k,
      toner_life_c: r.toner_life_c,
      toner_life_m: r.toner_life_m,
      toner_life_y: r.toner_life_y,
      toner_life_k: r.toner_life_k,
    },
    created_at: r.created_at!,
    hold: mapHold(r),
    arrival: mapArrival(r),
    departure: mapDeparture(r),
    purchase_invoice: mapInvoice(r),
    sales_invoice: mapSalesInvoice(r),
    latest_comment: r.latest_comment,
  }
}

function mapHold(r: AssetDetailRow) {
  if (!r.hold_number) return null
  return {
    created_by: r.hold_by_name!,
    created_for: r.hold_for_name!,
    created_at: r.hold_created_at,
    customer: r.hold_customer!,
    from_dt: r.hold_from,
    to_dt: r.hold_to,
    notes: r.hold_notes,
    hold_number: r.hold_number,
  }
}

function mapArrival(r: AssetDetailRow) {
  if (!r.arrival_number) return null
  return {
    arrival_number: r.arrival_number,
    origin: r.arrival_origin!,
    destination_code: r.arrival_destination_city_code!,
    destination_street: r.arrival_destination_street!,
    transporter: r.arrival_transporter!,
    created_by: r.arrival_created_by_name!,
    notes: r.arrival_notes,
    created_at: r.arrival_created_at!,
  }
}

function mapDeparture(r: AssetDetailRow) {
  if (!r.departure_number) return null
  return {
    departure_number: r.departure_number,
    origin_code: r.departure_origin_city_code!,
    origin_street: r.departure_origin_street!,
    destination: r.departure_destination!,
    transporter: r.departure_transporter!,
    created_by: r.departure_created_by_name ?? '',
    notes: r.departure_notes,
    created_at: r.departure_created_at!,
  }
}

function mapInvoice(r: AssetDetailRow) {
  if (!r.purchase_invoice_number) return null
  return {
    invoice_number: r.purchase_invoice_number,
    is_cleared: r.purchase_invoice_is_cleared!,
  }
}

function mapSalesInvoice(r: AssetDetailRow) {
  if (!r.sales_invoice_number) return null
  return {
    invoice_number: r.sales_invoice_number,
    is_cleared: r.sales_invoice_is_cleared!,
  }
}
