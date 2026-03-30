import { z } from 'zod';


export const AssetSummarySchema = z.object({
  barcode: z.string(),
  brand: z.string(),
  model: z.string(),
  asset_type: z.string(),
  serial_number: z.string(),
  meter_total: z.bigint().nullable(),
  availability_status: z.string(),
  tracking_status: z.string(),
  technical_status: z.string(),
  warehouse_city_code: z.string().nullable(),
  warehouse_street: z.string().nullable()
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
  location: string
  warehouse_code: string
  warehouse_street: string
  cost: {
    purchase_cost: string
    transport_cost: string
    processing_cost: string
    other_cost: string
    parts_cost: string
    total_cost: string
    sale_price: string
  }
  specs: {
    cassettes: number
    internal_finisher: string
    meter_black: string
    meter_colour: string
    meter_total: string
    drum_life_c: number
    drum_life_m: number
    drum_life_y: number
    drum_life_k: number
  }
  hold: {
    created_by: string
    created_for: string
    created_at: string | null
    customer: string
    from_dt: string
    to_dt: string
    notes: string
    hold_number: string
  }
  created_at: string
  is_held: boolean
  arrival: {
    arrival_number: string
    origin: string
    destination_code: string
    destination_street: string
    transporter: string
    created_by: string
    notes: string
    created_at: string
  }
  departure: {
    departure_number: string
    origin_code: string
    origin_street: string
    destination: string
    transporter: string
    created_by: string
    notes: string
    created_at: string
  }
  purchase_invoice: {
    invoice_number: string
    is_cleared: boolean
  }
}

export type Error = {
  code: string
  description: string
  category: string
  is_fixed: boolean
  added_at: string
  added_by: string
  fixed_at: string
  fixed_by: string
}

export type Comment = {
  comment: string
  username: string
  created_at: string
  updated_at: string
  initials: string
}

export type AssetTransfer = {
  created_at: string
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
  type: string
  part: string
}

