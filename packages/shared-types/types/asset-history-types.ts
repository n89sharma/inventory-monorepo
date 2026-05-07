export type AssetCreateSnapshot = {
  barcode: string
  serial_number: string
  brand_name?: string
  model_name?: string
  arrival_number?: string | null
}

export type AssetUpdateDiff = Partial<{
  arrival_number: string | null
  departure_number: string | null
  hold_number: string | null
  invoice_number: string | null
  location: string | null
  model_name: string
  technical_status: string
  serial_number: string
  meter_black: number | null
  meter_colour: number | null
  meter_total: number | null
  cassettes: number | null
  internal_finisher: string | null
  drum_life_c: number | null
  drum_life_m: number | null
  drum_life_y: number | null
  drum_life_k: number | null
  purchase_cost: number | null
  transport_cost: number | null
  processing_cost: number | null
  other_cost: number | null
  parts_cost: number | null
  total_cost: number | null
  sale_price: number | null
  error_codes: string[]
}>

export type AssetHistoryRecord =
  | {
      action_type: 'CREATE'
      user_name: string
      changed_on: Date
      changes: { after: AssetCreateSnapshot }
    }
  | {
      action_type: 'UPDATE'
      user_name: string
      changed_on: Date
      changes: { before: AssetUpdateDiff; after: AssetUpdateDiff }
    }

export type AssetHistory = AssetHistoryRecord[]
