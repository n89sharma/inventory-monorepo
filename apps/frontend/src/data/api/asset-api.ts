import { api } from '@/data/api/axios-client'
import { formatUSD, getFormattedDate, getInitials, getPartNames } from '@/lib/formatters'
import { getIdOrNullFromSelection, type SelectOption } from '@/ui-types/select-option-types'
import type { AssetDetails, AssetSummary, AssetTransfer, Comment, Error, Model, Part, Status, Warehouse } from 'shared-types'
import { AssetSummarySchema } from 'shared-types'
import { z } from 'zod'

interface AssetDetailResponse {
  barcode: string,
  serial_number: string,
  model: string,
  brand: string
  asset_type: string,
  tracking_status: string,
  availability_status: string,
  technical_status: string,
  location_city_code: string,
  location_street: string,
  location: string,
  created_at: string,
  is_held: boolean,
  purchase_cost: number,
  transport_cost: number,
  processing_cost: number,
  other_cost: number,
  parts_cost: number,
  total_cost: number,
  sale_price: number
  ts_cassettes: number,
  internal_finisher: string,
  meter_black: number,
  meter_colour: number,
  drum_life_c: number,
  drum_life_m: number,
  drum_life_y: number,
  drum_life_k: number,
  hold_by_email: string,
  hold_by_name: string,
  hold_for_email: string,
  hold_for_name: string,
  hold_created_at: string,
  hold_customer: string,
  hold_from: string,
  hold_to: string,
  hold_notes: string,
  hold_number: string,
  arrival_number: string,
  arrival_origin: string,
  arrival_destination_city_code: string,
  arrival_destination_street: string,
  arrival_transporter: string,
  arrival_created_by_email: string,
  arrival_created_by_name: string,
  arrival_notes: string,
  arrival_created_at: string,
  departure_number: string,
  departure_origin_city_code: string,
  departure_origin_street: string,
  departure_destination: string,
  departure_transporter: string,
  departure_created_by_email: string,
  departure_created_by_name: string,
  departure_notes: string,
  departure_created_at: string,
  purchase_invoice_number: string,
  purchase_invoice_is_cleared: boolean
}

interface CommentResponse {
  comment: string,
  username: string,
  created_at: string,
  updated_at: string
}

interface PartResponse {
  recipient: string,
  donor: string,
  store_part_number: string,
  updated_at: string,
  username: string,
  notes: string
}

function mapAssetDetail(r: AssetDetailResponse): AssetDetails {
  return {
    barcode: r.barcode,
    serial_number: r.serial_number,
    model: r.model,
    brand: r.brand,
    asset_type: r.asset_type,
    tracking_status: r.tracking_status,
    availability_status: r.availability_status,
    technical_status: r.technical_status,
    location: r.location,
    warehouse_code: r.location_city_code,
    warehouse_street: r.location_street,
    cost: {
      purchase_cost: formatUSD(r.purchase_cost),
      transport_cost: formatUSD(r.transport_cost),
      processing_cost: formatUSD(r.processing_cost),
      other_cost: formatUSD(r.other_cost),
      parts_cost: formatUSD(r.parts_cost),
      total_cost: formatUSD(r.total_cost),
      sale_price: formatUSD(r.sale_price)
    },
    specs: {
      cassettes: r.ts_cassettes,
      internal_finisher: r.internal_finisher,
      meter_black: r.meter_black,
      meter_colour: r.meter_colour,
      meter_total: r.meter_black + r.meter_colour,
      drum_life_c: r.drum_life_c,
      drum_life_m: r.drum_life_m,
      drum_life_y: r.drum_life_y,
      drum_life_k: r.drum_life_k,
    },
    created_at: getFormattedDate(r.created_at),
    is_held: r.is_held,
    hold: {
      created_by: r.hold_by_name,
      created_for: r.hold_for_name,
      created_at: !!r.hold_created_at ? getFormattedDate(r.hold_created_at) : null,
      customer: r.hold_customer,
      from_dt: r.hold_from,
      to_dt: r.hold_to,
      notes: r.hold_notes,
      hold_number: r.hold_number
    },
    arrival: {
      arrival_number: r.arrival_number,
      origin: r.arrival_origin,
      destination_code: r.arrival_destination_city_code,
      destination_street: r.arrival_destination_street,
      transporter: r.arrival_transporter,
      created_by: r.arrival_created_by_name,
      notes: r.arrival_notes,
      created_at: !!r.arrival_created_at ? getFormattedDate(r.arrival_created_at) : ''
    },
    departure: {
      departure_number: r.departure_number,
      origin_code: r.departure_origin_city_code,
      origin_street: r.departure_origin_city_code,
      destination: r.departure_destination,
      transporter: r.departure_transporter,
      created_by: r.departure_created_by_name,
      notes: r.departure_notes,
      created_at: !!r.departure_created_at ? getFormattedDate(r.departure_created_at) : ''
    },
    purchase_invoice: {
      invoice_number: r.purchase_invoice_number,
      is_cleared: r.purchase_invoice_is_cleared
    }
  }
}

function mapAssetComments(c: CommentResponse): Comment {
  return {
    comment: c.comment,
    username: c.username,
    created_at: getFormattedDate(c.created_at, true),
    updated_at: getFormattedDate(c.updated_at, true),
    initials: getInitials(c.username)
  }
}

function mapAssetTransfers(t: AssetTransfer): AssetTransfer {
  return {
    created_at: getFormattedDate(t.created_at),
    source_code: t.source_code,
    source_stree: t.source_stree,
    destination_code: t.destination_code,
    destination_street: t.destination_street,
    transfer_number: t.transfer_number,
    transporter: t.transporter
  }
}

function mapAssetParts(p: PartResponse): Part {
  return {
    recipient: p.recipient,
    donor: p.donor,
    store_part_number: p.store_part_number,
    type: p.store_part_number ? 'STORE' : 'MACHINE',
    part: getPartNames(p.notes)
  }
}

export async function getAssetDetail(params: { barcode: string }): Promise<AssetDetails> {
  const res = await api.get<AssetDetailResponse>(`/assets/${params.barcode}`)
  return mapAssetDetail(res.data)
}

export async function getAssetAccessories(params: { barcode: string }): Promise<string[]> {
  const res = await api.get<string[]>(`/assets/${params.barcode}/accessories`)
  return res.data
}

export async function getAssetErrors(params: { barcode: string }): Promise<Error[]> {
  const res = await api.get<Error[]>(`/assets/${params.barcode}/errors`)
  return res.data
}

export async function getAssetComments(params: { barcode: string }): Promise<Comment[]> {
  const res = await api.get<CommentResponse[]>(`/assets/${params.barcode}/comments`)
  return res.data.map(mapAssetComments)
}

export async function getAssetTransfers(params: { barcode: string }): Promise<AssetTransfer[]> {
  const res = await api.get<AssetTransfer[]>(`/assets/${params.barcode}/transfers`)
  return res.data.map(mapAssetTransfers)
}

export async function getAssetParts(params: { barcode: string }): Promise<Part[]> {
  const res = await api.get<PartResponse[]>(`/assets/${params.barcode}/parts`)
  return res.data.map(mapAssetParts)
}

function getPromiseResult<T>(result: PromiseSettledResult<T>) {
  return {
    status: result.status,
    result: result.status === 'fulfilled' ? result.value : result.reason
  }
}

export async function getAllAssetDetails(barcode: string) {
  const results = await Promise.allSettled([
    getAssetDetail({ barcode }),
    getAssetAccessories({ barcode }),
    getAssetErrors({ barcode }),
    getAssetComments({ barcode }),
    getAssetTransfers({ barcode }),
    getAssetParts({ barcode })
  ])

  return {
    assetDetails: getPromiseResult(results[0]),
    assetAccessories: getPromiseResult(results[1]),
    assetErrors: getPromiseResult(results[2]),
    assetComments: getPromiseResult(results[3]),
    assetTransfers: getPromiseResult(results[4]),
    assetParts: getPromiseResult(results[5])
  }
}

export async function getAssetsForQuery(
  model: Model,
  meter: number | null,
  availabilityStatus: SelectOption<Status>,
  technicalStatus: SelectOption<Status>,
  warehouse: SelectOption<Warehouse>): Promise<AssetSummary[]> {

  const res = await api.get(`/assets`, {
    params: {
      model: model.model_name,
      meter: meter,
      availabilityStatusId: getIdOrNullFromSelection(availabilityStatus),
      technicalStatusId: getIdOrNullFromSelection(technicalStatus),
      warehouseId: getIdOrNullFromSelection(warehouse)
    }
  })
  return z.array(AssetSummarySchema).parse(res.data)
}