import { Prisma } from '../../generated/prisma/client.js'
import { prisma } from '../prisma.js'

// ─── State types for CREATE ───────────────────────────────────────────────────

type ArrivalState = {
  arrival_number: string; origin_id: number; destination_id: number
  transporter_id: number; notes: string | null; created_at: Date
}

type AssetCreateState = {
  barcode: string; serial_number: string; model_id: number
  tracking_status_id: number; availability_status_id: number; technical_status_id: number
  arrival_id?: number | null; departure_id?: number | null
  hold_id?: number | null; is_held?: boolean; purchase_invoice_id?: number | null
}

type DepartureState = {
  departure_number: string; origin_id: number; destination_id: number
  transporter_id: number; notes: string | null; created_at: Date
}

type HoldState = {
  hold_number: string; created_by_id: number; created_for_id: number
  customer_id: number; notes: string | null; from_dt: Date; to_dt: Date | null
}

type InvoiceState = {
  invoice_number: string; organization_id: number; invoice_type_id: number
  is_cleared: boolean; created_at: Date
}

type TransferState = {
  transfer_number: string; origin_id: number; destination_id: number
  transporter_id: number; notes: string | null; created_at: Date
}

// ─── Field types for UPDATE diffs ─────────────────────────────────────────────

type ArrivalUpdateFields = Partial<{
  origin_id: number; destination_id: number; transporter_id: number; notes: string | null
}>

type AssetUpdateFields = Partial<{
  arrival_id: number | null; departure_id: number | null; hold_id: number | null
  is_held: boolean; purchase_invoice_id: number | null; location_id: number | null
  model_id: number; serial_number: string; technical_status_id: number
  meter_black: number | null; meter_colour: number | null; meter_total: number | null
  cassettes: number | null; internal_finisher: string | null
  drum_life_c: number | null; drum_life_m: number | null
  drum_life_y: number | null; drum_life_k: number | null
  purchase_cost: number | null; transport_cost: number | null
  processing_cost: number | null; other_cost: number | null
  parts_cost: number | null; total_cost: number | null; sale_price: number | null
  error_ids: number[]
}>

type DepartureUpdateFields = Partial<{
  origin_id: number; destination_id: number; transporter_id: number; notes: string | null
}>

type HoldUpdateFields = Partial<{
  created_for_id: number; customer_id: number; notes: string | null
}>

type InvoiceUpdateFields = Partial<{ is_cleared: boolean }>

type TransferUpdateFields = Partial<{
  origin_id: number; destination_id: number; transporter_id: number; notes: string | null
}>

// ─── Base utilities (private) ─────────────────────────────────────────────────

async function recordHistory(
  entityType: string,
  entityId: number,
  actionType: 'CREATE' | 'UPDATE' | 'DELETE',
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
    console.error(`History write failed [${actionType} ${entityType} ${entityId}]:`, error)
  }
}

function buildUpdateDiff(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): { before: Record<string, unknown>; after: Record<string, unknown> } | null {
  const diffBefore: Record<string, unknown> = {}
  const diffAfter: Record<string, unknown> = {}
  for (const key of Object.keys(after)) {
    if (before[key] !== after[key]) {
      diffBefore[key] = before[key]
      diffAfter[key] = after[key]
    }
  }
  if (Object.keys(diffAfter).length === 0) return null
  return { before: diffBefore, after: diffAfter }
}

// ─── Arrival ──────────────────────────────────────────────────────────────────

export async function recordArrivalCreate(arrivalId: number, state: ArrivalState, userId: number): Promise<void> {
  await recordHistory('Arrival', arrivalId, 'CREATE', userId, { after: state })
}

export async function recordArrivalUpdate(arrivalId: number, before: ArrivalUpdateFields, after: ArrivalUpdateFields, userId: number): Promise<void> {
  const diff = buildUpdateDiff(before as Record<string, unknown>, after as Record<string, unknown>)
  if (diff) await recordHistory('Arrival', arrivalId, 'UPDATE', userId, diff)
}

// ─── Asset ────────────────────────────────────────────────────────────────────

export async function recordAssetCreate(assetId: number, state: AssetCreateState, userId: number): Promise<void> {
  await recordHistory('Asset', assetId, 'CREATE', userId, { after: state })
}

export async function recordAssetUpdate(assetId: number, before: AssetUpdateFields, after: AssetUpdateFields, userId: number): Promise<void> {
  const diff = buildUpdateDiff(before as Record<string, unknown>, after as Record<string, unknown>)
  if (diff) await recordHistory('Asset', assetId, 'UPDATE', userId, diff)
}

// ─── Departure ────────────────────────────────────────────────────────────────

export async function recordDepartureCreate(departureId: number, state: DepartureState, userId: number): Promise<void> {
  await recordHistory('Departure', departureId, 'CREATE', userId, { after: state })
}

export async function recordDepartureUpdate(departureId: number, before: DepartureUpdateFields, after: DepartureUpdateFields, userId: number): Promise<void> {
  const diff = buildUpdateDiff(before as Record<string, unknown>, after as Record<string, unknown>)
  if (diff) await recordHistory('Departure', departureId, 'UPDATE', userId, diff)
}

// ─── Hold ─────────────────────────────────────────────────────────────────────

export async function recordHoldCreate(holdId: number, state: HoldState, userId: number): Promise<void> {
  await recordHistory('Hold', holdId, 'CREATE', userId, { after: state })
}

export async function recordHoldUpdate(holdId: number, before: HoldUpdateFields, after: HoldUpdateFields, userId: number): Promise<void> {
  const diff = buildUpdateDiff(before as Record<string, unknown>, after as Record<string, unknown>)
  if (diff) await recordHistory('Hold', holdId, 'UPDATE', userId, diff)
}

// ─── Invoice ──────────────────────────────────────────────────────────────────

export async function recordInvoiceCreate(invoiceId: number, state: InvoiceState, userId: number): Promise<void> {
  await recordHistory('Invoice', invoiceId, 'CREATE', userId, { after: state })
}

export async function recordInvoiceUpdate(invoiceId: number, before: InvoiceUpdateFields, after: InvoiceUpdateFields, userId: number): Promise<void> {
  const diff = buildUpdateDiff(before as Record<string, unknown>, after as Record<string, unknown>)
  if (diff) await recordHistory('Invoice', invoiceId, 'UPDATE', userId, diff)
}

// ─── Transfer ─────────────────────────────────────────────────────────────────

export async function recordTransferCreate(transferId: number, state: TransferState, userId: number): Promise<void> {
  await recordHistory('Transfer', transferId, 'CREATE', userId, { after: state })
}

export async function recordTransferUpdate(transferId: number, before: TransferUpdateFields, after: TransferUpdateFields, userId: number): Promise<void> {
  const diff = buildUpdateDiff(before as Record<string, unknown>, after as Record<string, unknown>)
  if (diff) await recordHistory('Transfer', transferId, 'UPDATE', userId, diff)
}
