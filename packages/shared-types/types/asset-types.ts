import { z } from 'zod';


export const AssetSummarySchema = z.object({
  id: z.number(),
  barcode: z.string(),
  brand: z.string(),
  model: z.string(),
  asset_type: z.string(),
  serial_number: z.string(),
  meter_total: z.number().nullable(),
  availability_status: z.string(),
  tracking_status: z.string(),
  technical_status: z.string(),
  warehouse_city_code: z.string().nullable(),
  warehouse_street: z.string().nullable(),
  is_held: z.boolean().optional()
})

export type AssetSummary = z.infer<typeof AssetSummarySchema>

export type AssetDetails = {
  barcode: string
  model: string
  brand: string
  asset_type: string
  serial_number: string
  availability_status: string
  tracking_status: string
  technical_status: string
  location: string | null
  warehouse_code: string | null
  warehouse_street: string | null
  cost: {
    purchase_cost: number | null
    transport_cost: number | null
    processing_cost: number | null
    other_cost: number | null
    parts_cost: number | null
    total_cost: number | null
    sale_price: number | null
  }
  specs: {
    cassettes: number | null
    internal_finisher: string | null
    meter_black: number | null
    meter_colour: number | null
    meter_total: number | null
    drum_life_c: number | null
    drum_life_m: number | null
    drum_life_y: number | null
    drum_life_k: number | null
  }
  hold: {
    created_by: string
    created_for: string
    created_at: Date | null
    customer: string
    from_dt: Date | null
    to_dt: Date | null
    notes: string | null
    hold_number: string
  } | null
  created_at: Date
  is_held: boolean
  arrival: {
    arrival_number: string
    origin: string
    destination_code: string
    destination_street: string
    transporter: string
    created_by: string
    notes: string | null
    created_at: Date
  } | null
  departure: {
    departure_number: string
    origin_code: string
    origin_street: string
    destination: string
    transporter: string
    created_by: string
    notes: string | null
    created_at: Date
  } | null
  purchase_invoice: {
    invoice_number: string
    is_cleared: boolean
  } | null
}

export type Error = {
  code: string
  description: string | null
  category: string
  is_fixed: boolean
  added_at: Date | null
  added_by: string
  fixed_at: Date | null
  fixed_by: string
}

export type Comment = {
  comment: string
  username: string
  created_at: Date
  updated_at: Date
  initials: string
}

export type AssetTransfer = {
  created_at: Date
  source_code: string
  source_stree: string
  destination_code: string
  destination_street: string
  transfer_number: string
  transporter: string
}

export type Part = {
  recipient: string
  donor: string
  store_part_number: string
  updated_at: Date
  username: string
  notes: string
  type: string
  partName: string
}

