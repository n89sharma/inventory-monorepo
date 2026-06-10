import type { Permission } from 'shared-types'

export type ColumnSectionId =
  | 'specs'
  | 'cost'
  | 'arrival'
  | 'departure'
  | 'hold'
  | 'invoice'
  | 'general'
  | 'last_comment'

export type PickableColumn = {
  readonly id: string
  readonly label: string
  readonly section: ColumnSectionId
  readonly defaultVisible: boolean
  readonly disabled: boolean
  readonly permission?: Permission
}

export const COLUMN_SECTIONS = [
  { id: 'general',      label: 'General' },
  { id: 'specs',        label: 'Specs' },
  { id: 'cost',         label: 'Cost' },
  { id: 'arrival',      label: 'Arrival' },
  { id: 'departure',    label: 'Departure' },
  { id: 'hold',         label: 'Hold' },
  { id: 'invoice',      label: 'Invoice' },
  { id: 'last_comment', label: 'Last Comment' },
] as const satisfies readonly { id: ColumnSectionId; label: string }[]

export const PICKABLE_COLUMNS = [
  // General
  { id: 'asset_type',    label: 'Asset Type',    section: 'general', defaultVisible: false, disabled: false },
  { id: 'serial_number', label: 'Serial Number', section: 'general', defaultVisible: true,  disabled: false },
  { id: 'status',        label: 'Status',        section: 'general', defaultVisible: true,  disabled: false },
  { id: 'readiness',     label: 'Readiness',     section: 'general', defaultVisible: true,  disabled: false },
  { id: 'location',      label: 'Location',      section: 'general', defaultVisible: true,  disabled: false },

  // Specs
  { id: 'country_of_origin',       label: 'Country of Origin', section: 'specs', defaultVisible: false, disabled: false },
  { id: 'specs_cassettes',         label: 'Cassettes',         section: 'specs', defaultVisible: false, disabled: false },
  { id: 'specs_internal_finisher', label: 'Internal Finisher', section: 'specs', defaultVisible: false, disabled: false },
  { id: 'specs_meter_total',       label: 'Total Meter',       section: 'specs', defaultVisible: true,  disabled: false },
  { id: 'specs_toner_life_c',      label: 'Toner Life C',      section: 'specs', defaultVisible: false, disabled: false },
  { id: 'specs_toner_life_m',      label: 'Toner Life M',      section: 'specs', defaultVisible: false, disabled: false },
  { id: 'specs_toner_life_y',      label: 'Toner Life Y',      section: 'specs', defaultVisible: false, disabled: false },
  { id: 'specs_toner_life_k',      label: 'Toner Life K',      section: 'specs', defaultVisible: false, disabled: false },

  // Cost
  { id: 'cost_purchase_cost', label: 'Purchase Cost', section: 'cost', defaultVisible: false, disabled: false, permission: 'view_purchase_price' },
  { id: 'cost_total_cost',    label: 'Total Cost',    section: 'cost', defaultVisible: false, disabled: false, permission: 'view_purchase_price' },
  { id: 'cost_sale_price',    label: 'Sale Price',    section: 'cost', defaultVisible: false, disabled: false, permission: 'view_sale_price' },

  // Arrival
  { id: 'arrival_arrival_number', label: 'Arrival #',           section: 'arrival', defaultVisible: false, disabled: true  },
  { id: 'vendor',                 label: 'Vendor',              section: 'arrival', defaultVisible: false, disabled: false },
  { id: 'arrival_warehouse',      label: 'Arrival Warehouse',   section: 'arrival', defaultVisible: false, disabled: true  },
  { id: 'arrival_transporter',    label: 'Arrival Transporter', section: 'arrival', defaultVisible: false, disabled: true  },
  { id: 'arrival_created_by',     label: 'Arrived By',          section: 'arrival', defaultVisible: false, disabled: true  },
  { id: 'arrival_created_at',     label: 'Arrived At',          section: 'arrival', defaultVisible: false, disabled: false },

  // Departure
  { id: 'departure_departure_number', label: 'Departure #',           section: 'departure', defaultVisible: false, disabled: true  },
  { id: 'departure_warehouse',        label: 'Departure Warehouse',   section: 'departure', defaultVisible: false, disabled: true  },
  { id: 'customer',                   label: 'Customer',              section: 'departure', defaultVisible: false, disabled: false },
  { id: 'departure_transporter',      label: 'Departure Transporter', section: 'departure', defaultVisible: false, disabled: true  },
  { id: 'departure_created_by',       label: 'Departed By',           section: 'departure', defaultVisible: false, disabled: true  },
  { id: 'departed_at',                label: 'Departed At',           section: 'departure', defaultVisible: false, disabled: false },

  // Hold
  { id: 'hold_hold_number', label: 'Hold #',          section: 'hold', defaultVisible: false, disabled: true  },
  { id: 'held_by',          label: 'Held By',         section: 'hold', defaultVisible: false, disabled: false },
  { id: 'hold_created_for', label: 'Held For',        section: 'hold', defaultVisible: false, disabled: false },
  { id: 'hold_customer',    label: 'Hold Customer',   section: 'hold', defaultVisible: false, disabled: false },
  { id: 'hold_created_at',  label: 'Hold Created',    section: 'hold', defaultVisible: false, disabled: false },
  { id: 'hold_from_dt',     label: 'Hold From',       section: 'hold', defaultVisible: false, disabled: true  },
  { id: 'hold_to_dt',       label: 'Hold To',         section: 'hold', defaultVisible: false, disabled: true  },
  { id: 'hold_notes',       label: 'Hold Notes',      section: 'hold', defaultVisible: false, disabled: true  },

  // Invoice
  { id: 'purchase_invoice_invoice_number', label: 'Invoice #',       section: 'invoice', defaultVisible: false, disabled: false },
  { id: 'purchase_invoice_is_cleared',     label: 'Invoice Cleared', section: 'invoice', defaultVisible: false, disabled: true  },

  // Last Comment
  { id: 'latest_comment', label: 'Last Comment', section: 'last_comment', defaultVisible: false, disabled: false },
] as const satisfies readonly PickableColumn[]

export const DEFAULT_VISIBLE_COLUMN_IDS: readonly string[] =
  PICKABLE_COLUMNS.filter(c => c.defaultVisible).map(c => c.id)

export const ENABLED_PICKABLE_COUNT: number =
  PICKABLE_COLUMNS.filter(c => !c.disabled).length
