import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/shadcn/tooltip'
import { getReadinessDisplay } from '@/components/shared/readiness/readiness-config'
import { ReadinessIcon } from '@/components/shared/readiness/readiness-icon'
import { StatusBadge } from '@/components/shared/status-badge'
import {
  formatDate,
  formatLocation,
  formatMarginPercent,
  formatThousandsK,
  formatTitleCase,
  formatUSDWithSymbol,
  formatWeight,
} from '@/lib/formatters'
import type { PriceCellEditorRegistry } from '@/lib/price-cell-navigation'
import type { SearchList } from '@/ui-types/navigation-context'
import { differenceInCalendarDays } from 'date-fns'
import type { ReactNode } from 'react'
import { ASSET_STATUS, type AssetSearchRow, type Permission } from 'shared-types'
import {
  ID_COLUMN_SIZE,
  IdLink,
  MODEL_COLUMN_SIZE,
  SERIAL_NUMBER_COLUMN_SIZE,
} from './column-primitives'

const holdDetailHref = (holdNumber: string): string => `/holds/${holdNumber}`

const arrivalDetailHref = (arrivalNumber: string): string => `/arrivals/${arrivalNumber}`

const departureDetailHref = (departureNumber: string): string => `/departures/${departureNumber}`

const invoiceDetailHref = (invoiceNumber: string): string => `/invoices/${invoiceNumber}`

const stockDays = (createdAt: Date): number => differenceInCalendarDays(new Date(), createdAt)

export const daysHeld = (heldOn: Date | null): number | undefined =>
  heldOn ? differenceInCalendarDays(new Date(), heldOn) : undefined

const MARGIN_PERMISSIONS = ['view_sale_price', 'view_purchase_price'] as const
const TOTAL_LOSS_MARGIN_PERCENT = -100

const grossMargin = (salePrice: number | null, totalCost: number | null): number | undefined => {
  if (salePrice == null || totalCost == null) return undefined
  return salePrice - totalCost
}

// A zero sale price has no percentage to divide into, so a cost written off against
// nothing counts as a total loss, and a costless asset as flat.
const marginPercent = (salePrice: number | null, totalCost: number | null): number | undefined => {
  if (salePrice == null || totalCost == null) return undefined
  if (salePrice === 0 && totalCost === 0) return 0
  if (salePrice === 0) return TOTAL_LOSS_MARGIN_PERCENT
  return ((salePrice - totalCost) / salePrice) * 100
}

export type ColumnSectionId =
  | 'identity'
  | 'status'
  | 'general_specs'
  | 'cost'
  | 'invoice'
  | 'arrival'
  | 'hold'
  | 'departure'
  | 'detailed_specs'
  | 'profitability'
  | 'other'

// What the barcode cell needs from the page rendering it: every list links an asset
// back to its own section, so the href cannot be static.
export type AssetCellContext = {
  detailHref: (row: AssetSearchRow) => string
  // Supplied only when the viewer holds edit_prices; absent renders read-only cost text.
  priceEditorRegistry?: PriceCellEditorRegistry
}

export type AssetSearchColumn = {
  readonly id: string
  readonly label: string
  readonly section: ColumnSectionId
  // Every listed permission is required; a viewer missing any one loses the column.
  readonly permissions?: readonly Permission[]
  // Shown unconditionally and never offered in the picker: barcode, serial number, model.
  readonly alwaysVisible?: boolean
  readonly sortable?: boolean
  readonly size?: number
  readonly sortUndefined?: 'last'
  // Raw value TanStack sorts and filters on. Omit when `id` is an AssetSearchRow key,
  // so numbers and dates keep sorting as numbers and dates rather than as text.
  readonly accessor?: (row: AssetSearchRow) => unknown
  // The column's string form: the CSV field, and the table cell when `cell` is absent.
  readonly text: (row: AssetSearchRow) => string
  // Display override when the cell is not plain text.
  readonly cell?: (row: AssetSearchRow, context: AssetCellContext) => ReactNode
}

// Order here is the order the picker lists its groups in. Table column order is
// independent: it follows ASSET_SEARCH_COLUMNS. 'identity' is deliberately absent —
// its columns are alwaysVisible, so listing it would render an empty group.
export const COLUMN_SECTIONS = [
  { id: 'status', label: 'Status' },
  { id: 'general_specs', label: 'General Specifications' },
  { id: 'cost', label: 'Cost' },
  { id: 'invoice', label: 'Invoice' },
  { id: 'arrival', label: 'Arrival' },
  { id: 'hold', label: 'Hold' },
  { id: 'departure', label: 'Departure' },
  { id: 'detailed_specs', label: 'Detailed Specifications' },
  { id: 'profitability', label: 'Profitability' },
  { id: 'other', label: 'Other' },
] as const satisfies readonly { id: ColumnSectionId; label: string }[]

function StatusCell({ asset }: { asset: AssetSearchRow }): ReactNode {
  const { status, held_by, hold_hold_number } = asset
  if (status !== ASSET_STATUS.HELD || !held_by || !hold_hold_number) {
    return <StatusBadge status={status} />
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-block">
          <StatusBadge status={status} />
        </span>
      </TooltipTrigger>
      <TooltipContent>
        Held by {held_by} ({hold_hold_number})
      </TooltipContent>
    </Tooltip>
  )
}

function CollectionNumberCell({
  collectionNumber,
  detailHref,
}: {
  collectionNumber: string | null
  detailHref: (collectionNumber: string) => string
}): ReactNode {
  if (!collectionNumber) return ''
  return <IdLink to={detailHref(collectionNumber)}>{collectionNumber}</IdLink>
}

function InvoiceCell({
  invoiceNumber,
  label,
}: {
  invoiceNumber: string | null
  label: string | null
}): ReactNode {
  if (!invoiceNumber || !label) return ''
  return <IdLink to={invoiceDetailHref(invoiceNumber)}>{label}</IdLink>
}

function LastCommentCell({ comment }: { comment: string | null }): ReactNode {
  if (!comment) return ''
  return (
    <div className="text-left text-xs">
      <div className="whitespace-pre-wrap">{comment}</div>
    </div>
  )
}

function optionalNumber(value: number | null): string {
  return value == null ? '' : String(value)
}

// Kept un-annotated so AssetColumnId can read the literal ids off it. Consumers use the
// widened ASSET_SEARCH_COLUMNS below, where the optional fields exist on every element.
const ASSET_SEARCH_COLUMN_LITERALS = [
  {
    id: 'barcode',
    label: 'Barcode',
    section: 'identity',
    alwaysVisible: true,
    sortable: true,
    size: ID_COLUMN_SIZE,
    text: (a) => a.barcode,
    cell: (a, { detailHref }) => <IdLink to={detailHref(a)}>{a.barcode}</IdLink>,
  },
  {
    id: 'brand',
    label: 'Brand',
    section: 'detailed_specs',
    text: (a) => formatTitleCase(a.brand),
  },
  {
    id: 'model',
    label: 'Model',
    section: 'identity',
    alwaysVisible: true,
    sortable: true,
    size: MODEL_COLUMN_SIZE,
    text: (a) => a.model,
  },
  {
    id: 'asset_type',
    label: 'Asset Type',
    section: 'detailed_specs',
    text: (a) => formatTitleCase(a.asset_type),
  },
  {
    id: 'serial_number',
    label: 'Serial Number',
    section: 'identity',
    alwaysVisible: true,
    sortable: true,
    size: SERIAL_NUMBER_COLUMN_SIZE,
    text: (a) => a.serial_number,
  },
  {
    id: 'status',
    label: 'Status',
    section: 'status',
    text: (a) => formatTitleCase(a.status),
    cell: (a) => <StatusCell asset={a} />,
  },
  {
    id: 'readiness',
    label: 'Readiness',
    section: 'status',
    sortable: true,
    text: (a) => getReadinessDisplay(a.readiness),
    cell: (a) => <ReadinessIcon status={a.readiness} />,
  },
  {
    id: 'location',
    label: 'Location',
    section: 'other',
    sortable: true,
    accessor: (a) => formatLocation(a.location, a.is_in_transit),
    text: (a) => formatLocation(a.location, a.is_in_transit),
  },
  {
    id: 'country_of_origin',
    label: 'Country of Origin',
    section: 'detailed_specs',
    text: (a) => formatTitleCase(a.country_of_origin ?? ''),
  },
  {
    id: 'specs_meter_total',
    label: 'Total Meter',
    section: 'general_specs',
    sortable: true,
    text: (a) => formatThousandsK(a.specs_meter_total),
  },
  {
    id: 'weight',
    label: 'Weight',
    section: 'detailed_specs',
    sortable: true,
    text: (a) => formatWeight(a.weight),
  },
  {
    id: 'size',
    label: 'Size',
    section: 'detailed_specs',
    sortable: true,
    text: (a) => String(a.size),
  },
  {
    id: 'days_held',
    label: 'Days Held',
    section: 'hold',
    sortable: true,
    sortUndefined: 'last',
    accessor: (a) => daysHeld(a.hold_created_at),
    text: (a) => optionalNumber(daysHeld(a.hold_created_at) ?? null),
  },
  {
    id: 'specs_cassettes',
    label: 'Cassettes',
    section: 'general_specs',
    sortable: true,
    text: (a) => optionalNumber(a.specs_cassettes),
  },
  {
    id: 'specs_internal_finisher',
    label: 'Internal Finisher',
    section: 'general_specs',
    sortable: true,
    text: (a) => a.specs_internal_finisher ?? '',
  },
  {
    id: 'accessories',
    label: 'Accessories',
    section: 'general_specs',
    text: (a) => a.accessories.join(', '),
  },
  {
    id: 'specs_toner_life_c',
    label: 'Toner Life C',
    section: 'detailed_specs',
    sortable: true,
    text: (a) => optionalNumber(a.specs_toner_life_c),
  },
  {
    id: 'specs_toner_life_m',
    label: 'Toner Life M',
    section: 'detailed_specs',
    sortable: true,
    text: (a) => optionalNumber(a.specs_toner_life_m),
  },
  {
    id: 'specs_toner_life_y',
    label: 'Toner Life Y',
    section: 'detailed_specs',
    sortable: true,
    text: (a) => optionalNumber(a.specs_toner_life_y),
  },
  {
    id: 'specs_toner_life_k',
    label: 'Toner Life K',
    section: 'detailed_specs',
    sortable: true,
    text: (a) => optionalNumber(a.specs_toner_life_k),
  },
  {
    id: 'vendor',
    label: 'Vendor',
    section: 'arrival',
    sortable: true,
    text: (a) => formatTitleCase(a.vendor ?? ''),
  },
  {
    id: 'arrival_number',
    label: 'Arrival #',
    section: 'arrival',
    sortable: true,
    text: (a) => a.arrival_number ?? '',
    cell: (a) => (
      <CollectionNumberCell collectionNumber={a.arrival_number} detailHref={arrivalDetailHref} />
    ),
  },
  {
    id: 'arrival_warehouse_code',
    label: 'Arrival Warehouse',
    section: 'arrival',
    sortable: true,
    text: (a) => a.arrival_warehouse_code ?? '',
  },
  {
    id: 'arrival_created_at',
    label: 'Arrived At',
    section: 'arrival',
    sortable: true,
    text: (a) => formatDate(a.arrival_created_at),
  },
  {
    id: 'customer',
    label: 'Customer',
    section: 'departure',
    sortable: true,
    text: (a) => formatTitleCase(a.customer ?? ''),
  },
  {
    id: 'salesperson',
    label: 'Salesperson',
    section: 'departure',
    sortable: true,
    text: (a) => formatTitleCase(a.salesperson ?? ''),
  },
  {
    id: 'departure_number',
    label: 'Departure #',
    section: 'departure',
    sortable: true,
    text: (a) => a.departure_number ?? '',
    cell: (a) => (
      <CollectionNumberCell
        collectionNumber={a.departure_number}
        detailHref={departureDetailHref}
      />
    ),
  },
  {
    id: 'departed_at',
    label: 'Departed At',
    section: 'departure',
    sortable: true,
    text: (a) => formatDate(a.departed_at),
  },
  {
    id: 'cost_purchase_cost',
    label: 'Purchase Cost',
    section: 'cost',
    permissions: ['view_purchase_price'],
    sortable: true,
    text: (a) => formatUSDWithSymbol(a.cost_purchase_cost),
  },
  {
    id: 'cost_transport_cost',
    label: 'Transport Cost',
    section: 'cost',
    permissions: ['view_purchase_price'],
    sortable: true,
    text: (a) => formatUSDWithSymbol(a.cost_transport_cost),
  },
  {
    id: 'cost_processing_cost',
    label: 'Processing Cost',
    section: 'cost',
    permissions: ['view_purchase_price'],
    sortable: true,
    text: (a) => formatUSDWithSymbol(a.cost_processing_cost),
  },
  {
    id: 'cost_total_cost',
    label: 'Total Cost',
    section: 'cost',
    permissions: ['view_purchase_price'],
    sortable: true,
    text: (a) => formatUSDWithSymbol(a.cost_total_cost),
  },
  {
    id: 'cost_sale_price',
    label: 'Sale Price',
    section: 'cost',
    permissions: ['view_sale_price'],
    sortable: true,
    text: (a) => formatUSDWithSymbol(a.cost_sale_price),
  },
  {
    id: 'gross_margin',
    label: 'Gross Margin',
    section: 'profitability',
    permissions: MARGIN_PERMISSIONS,
    sortable: true,
    sortUndefined: 'last',
    accessor: (a) => grossMargin(a.cost_sale_price, a.cost_total_cost),
    text: (a) => formatUSDWithSymbol(grossMargin(a.cost_sale_price, a.cost_total_cost) ?? null),
  },
  {
    id: 'margin_percent',
    label: 'Margin %',
    section: 'profitability',
    permissions: MARGIN_PERMISSIONS,
    sortable: true,
    sortUndefined: 'last',
    accessor: (a) => marginPercent(a.cost_sale_price, a.cost_total_cost),
    text: (a) => formatMarginPercent(marginPercent(a.cost_sale_price, a.cost_total_cost)),
  },
  {
    id: 'hold_hold_number',
    label: 'Hold #',
    section: 'hold',
    text: (a) => a.hold_hold_number ?? '',
    cell: (a) => (
      <CollectionNumberCell collectionNumber={a.hold_hold_number} detailHref={holdDetailHref} />
    ),
  },
  {
    id: 'held_by',
    label: 'Held By',
    section: 'hold',
    sortable: true,
    text: (a) => a.held_by ?? '',
  },
  {
    id: 'hold_created_for',
    label: 'Held For',
    section: 'hold',
    sortable: true,
    text: (a) => a.hold_created_for ?? '',
  },
  {
    id: 'hold_customer',
    label: 'Hold Customer',
    section: 'hold',
    sortable: true,
    text: (a) => formatTitleCase(a.hold_customer ?? ''),
  },
  {
    id: 'hold_created_at',
    label: 'Hold Created',
    section: 'hold',
    sortable: true,
    text: (a) => formatDate(a.hold_created_at),
  },
  {
    id: 'created_at',
    label: 'Created',
    section: 'other',
    sortable: true,
    text: (a) => formatDate(a.created_at),
  },
  {
    id: 'stock_days',
    label: 'Stock Days',
    section: 'other',
    sortable: true,
    accessor: (a) => stockDays(a.created_at),
    text: (a) => String(stockDays(a.created_at)),
  },
  {
    id: 'purchase_invoice_invoice_reference',
    label: 'Purchase Invoice',
    section: 'invoice',
    text: (a) => a.purchase_invoice_invoice_reference ?? '',
    cell: (a) => (
      <InvoiceCell
        invoiceNumber={a.purchase_invoice_invoice_number}
        label={a.purchase_invoice_invoice_reference}
      />
    ),
  },
  {
    id: 'sales_invoice_invoice_reference',
    label: 'Sales Invoice',
    section: 'invoice',
    text: (a) => a.sales_invoice_invoice_reference ?? '',
    cell: (a) => (
      <InvoiceCell
        invoiceNumber={a.sales_invoice_invoice_number}
        label={a.sales_invoice_invoice_reference}
      />
    ),
  },
  {
    id: 'errors',
    label: 'Errors',
    section: 'other',
    text: (a) => a.errors.join(', '),
  },
  {
    id: 'latest_comment',
    label: 'Last Comment',
    section: 'other',
    text: (a) => a.latest_comment ?? '',
    cell: (a) => <LastCommentCell comment={a.latest_comment} />,
  },
] as const satisfies readonly AssetSearchColumn[]

export type AssetColumnId = (typeof ASSET_SEARCH_COLUMN_LITERALS)[number]['id']

export const ASSET_SEARCH_COLUMNS: readonly AssetSearchColumn[] = ASSET_SEARCH_COLUMN_LITERALS

const MODEL_PRICE_HISTORY_DEFAULT_COLUMN_IDS = [
  'status',
  'readiness',
  'specs_meter_total',
  'stock_days',
] as const satisfies readonly AssetColumnId[]

const ONHAND_DEFAULT_COLUMN_IDS = [
  'status',
  'readiness',
  'specs_meter_total',
  'stock_days',
  'latest_comment',
] as const satisfies readonly AssetColumnId[]

const DEPARTED_DEFAULT_COLUMN_IDS = [
  'status',
  'specs_meter_total',
  'vendor',
  'arrival_created_at',
  'customer',
  'departed_at',
  'cost_total_cost',
  'cost_sale_price',
  'gross_margin',
  'margin_percent',
] as const satisfies readonly AssetColumnId[]

const HARVESTED_DEFAULT_COLUMN_IDS = [
  'status',
  'location',
  'specs_meter_total',
  'latest_comment',
] as const satisfies readonly AssetColumnId[]

export const ASSETS_BY_SERIAL_NUMBER_DEFAULT_COLUMN_IDS = [
  'status',
  'arrival_created_at',
] as const satisfies readonly AssetColumnId[]

export const DEFAULT_VISIBLE_COLUMN_IDS_BY_LIST = {
  onhand: ONHAND_DEFAULT_COLUMN_IDS,
  departed: DEPARTED_DEFAULT_COLUMN_IDS,
  harvested: HARVESTED_DEFAULT_COLUMN_IDS,
  'model-price-history': MODEL_PRICE_HISTORY_DEFAULT_COLUMN_IDS,
} as const satisfies Record<SearchList, readonly AssetColumnId[]>

const COLUMN_BY_ID = new Map<string, AssetSearchColumn>(ASSET_SEARCH_COLUMNS.map((c) => [c.id, c]))

export function canViewColumn(
  column: AssetSearchColumn,
  can: (permission: Permission) => boolean,
): boolean {
  return column.permissions?.every((permission) => can(permission)) ?? true
}

export function userCanToggleColumn(
  column: AssetSearchColumn,
  can: (permission: Permission) => boolean,
): boolean {
  const isAlwaysVisible = column.alwaysVisible ?? false
  const userCanViewColumn = canViewColumn(column, can)
  return !isAlwaysVisible && userCanViewColumn
}

export function orderedVisibleColumns(visibleColumns: Set<string>): readonly AssetSearchColumn[] {
  return ASSET_SEARCH_COLUMNS.filter((column) => {
    const isAlwaysVisible = column.alwaysVisible ?? false
    const userChoseColumn = visibleColumns.has(column.id)
    return isAlwaysVisible || userChoseColumn
  })
}

// Filters a stored/shared set of column ids down to what the current viewer may see:
// drops unknown ids (columns removed since the view was saved) and permission-gated
// columns the viewer lacks. Applied when restoring a saved view.
export function resolveVisibleColumns(
  columnIds: readonly string[],
  can: (permission: Permission) => boolean,
): Set<string> {
  const resolved = new Set<string>()
  for (const id of columnIds) {
    const column = COLUMN_BY_ID.get(id)
    if (!column) continue
    if (!canViewColumn(column, can)) continue
    resolved.add(id)
  }
  return resolved
}
