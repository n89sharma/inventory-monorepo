import {
  ASSET_STATUS,
  AssetSummary,
  CreateArrival,
  CreateArrivalSchema,
  CreateAsset,
  CreateDeparture,
  CreateHold,
  CreateInvoice,
  CreateTransfer,
  Country,
  DepartureAssetInput,
  INVOICE_TYPE,
  ModelSummary,
  OrgSummary,
  Status,
  UpdateAssetSpecs,
  Warehouse,
} from 'shared-types'
import { prisma } from '../src/prisma.js'
import { createArrival, getArrival } from '../src/services/arrivalService.js'

// Zone the arrival flow places assets in. Must match arrivalService.ts `arrivalZone`.
const ARRIVAL_ZONE = 'SHIPPING_AND_RECEIVING'
// Zone whose bin value is honored on relocation (assetLocationService.ts `BIN_ZONE`).
const BIN_ZONE = 'BIN'
const WAREHOUSE_CITY_CODE = 'YYZ'
const WAREHOUSE_STREET = '1 Test St'
const WAREHOUSE2_CITY_CODE = 'LAX'
const WAREHOUSE2_STREET = '2 Test Ave'

// Reference rows the collection flows need to exist before they run. The test DB is
// migrated but empty (no seed script), so each integration test seeds its own.
export interface ArrivalRefs {
  userId: number
  vendor: OrgSummary
  transporter: OrgSummary
  customer: OrgSummary
  warehouse: Warehouse
  warehouse2: Warehouse
  model: ModelSummary
  brandId: number
  readiness: Status
  country: Country
  invoiceTypeSaleId: number
  invoiceTypePurchaseId: number
  arrivalZoneId: number
  binZoneId: number
}

// Store transaction type names the service looks up (storePartService.ts).
const STORE_TXN_PURCHASE = 'PURCHASE'
const STORE_TXN_USED = 'USED'

// Asset serial numbers aren't unique in the schema, but a per-call counter keeps
// built assets distinguishable across multiple arrivals in one run.
let serialCounter = 0

// Build a non-empty tuple from an array (Create*Schema asset lists are `.nonempty()`).
function nonEmpty<T>(items: T[]): [T, ...T[]] {
  const [first, ...rest] = items
  if (first === undefined) throw new Error('expected at least one item')
  return [first, ...rest]
}

export async function seedReferenceData(): Promise<ArrivalRefs> {
  // Seed every status so any transition target (IN_STOCK, HELD, SOLD, …) resolves.
  for (const status of Object.values(ASSET_STATUS)) {
    await prisma.status.upsert({ where: { status }, create: { status }, update: {} })
  }

  const arrivalZone = await prisma.zone.upsert({
    where: { zone: ARRIVAL_ZONE },
    create: { zone: ARRIVAL_ZONE },
    update: {},
  })

  const binZone = await prisma.zone.upsert({
    where: { zone: BIN_ZONE },
    create: { zone: BIN_ZONE },
    update: {},
  })

  const readiness = await prisma.readiness.upsert({
    where: { status: 'READY' },
    create: { status: 'READY' },
    update: {},
  })

  // Country has no unique column, so upsert isn't available — find or create.
  const country =
    (await prisma.country.findFirst({ where: { name: 'China' } })) ??
    (await prisma.country.create({ data: { name: 'China' } }))

  const brand = await prisma.brand.upsert({
    where: { name: 'Canon' },
    create: { name: 'Canon' },
    update: {},
  })

  const assetType = await prisma.assetType.upsert({
    where: { asset_type: 'Copier' },
    create: { asset_type: 'Copier' },
    update: {},
  })

  const model = await prisma.model.upsert({
    where: { brand_id_name: { brand_id: brand.id, name: 'IRADX4745i' } },
    create: {
      name: 'IRADX4745i',
      weight: 1,
      size: 1,
      is_colour: false,
      brand_id: brand.id,
      asset_type_id: assetType.id,
    },
    update: {},
  })

  const warehouse = await prisma.warehouse.upsert({
    where: { city_code_street: { city_code: WAREHOUSE_CITY_CODE, street: WAREHOUSE_STREET } },
    create: { city_code: WAREHOUSE_CITY_CODE, street: WAREHOUSE_STREET, is_active: true },
    update: {},
  })

  const warehouse2 = await prisma.warehouse.upsert({
    where: { city_code_street: { city_code: WAREHOUSE2_CITY_CODE, street: WAREHOUSE2_STREET } },
    create: { city_code: WAREHOUSE2_CITY_CODE, street: WAREHOUSE2_STREET, is_active: true },
    update: {},
  })

  const user = await prisma.user.upsert({
    where: { name: 'John Doe' },
    create: { name: 'John Doe', is_active: true },
    update: {},
  })

  const vendor = await prisma.organization.upsert({
    where: { account_number: 'TEST-VENDOR' },
    create: { account_number: 'TEST-VENDOR', name: 'CopierPurchaseVendor' },
    update: {},
  })

  const transporter = await prisma.organization.upsert({
    where: { account_number: 'TEST-TRANSPORTER' },
    create: { account_number: 'TEST-TRANSPORTER', name: 'CopierTransports' },
    update: {},
  })

  const customer = await prisma.organization.upsert({
    where: { account_number: 'TEST-CUSTOMER' },
    create: { account_number: 'TEST-CUSTOMER', name: 'CopierBuyer' },
    update: {},
  })

  const invoiceTypeSale = await prisma.invoiceType.upsert({
    where: { type: INVOICE_TYPE.sales },
    create: { type: INVOICE_TYPE.sales },
    update: {},
  })
  const invoiceTypePurchase = await prisma.invoiceType.upsert({
    where: { type: INVOICE_TYPE.purchase },
    create: { type: INVOICE_TYPE.purchase },
    update: {},
  })

  await prisma.storeTransactionType.upsert({
    where: { type: STORE_TXN_PURCHASE },
    create: { type: STORE_TXN_PURCHASE, is_inbound: true },
    update: {},
  })
  await prisma.storeTransactionType.upsert({
    where: { type: STORE_TXN_USED },
    create: { type: STORE_TXN_USED, is_inbound: false },
    update: {},
  })

  const toOrgSummary = (o: { id: number; account_number: string; name: string }): OrgSummary => ({
    id: o.id,
    account_number: o.account_number,
    name: o.name,
  })
  const toWarehouse = (w: {
    id: number
    city_code: string
    street: string
    is_active: boolean
  }): Warehouse => ({
    id: w.id,
    city_code: w.city_code,
    street: w.street,
    is_active: w.is_active,
  })

  return {
    userId: user.id,
    vendor: toOrgSummary(vendor),
    transporter: toOrgSummary(transporter),
    customer: toOrgSummary(customer),
    warehouse: toWarehouse(warehouse),
    warehouse2: toWarehouse(warehouse2),
    model: {
      id: model.id,
      brand_name: brand.name,
      model_name: model.name,
      asset_type: assetType.asset_type,
      weight: model.weight,
      size: model.size,
      is_colour: model.is_colour,
    },
    brandId: brand.id,
    readiness: { id: readiness.id, status: readiness.status },
    country: { id: country.id, name: country.name },
    invoiceTypeSaleId: invoiceTypeSale.id,
    invoiceTypePurchaseId: invoiceTypePurchase.id,
    arrivalZoneId: arrivalZone.id,
    binZoneId: binZone.id,
  }
}

function buildAsset(refs: ArrivalRefs): CreateAsset {
  serialCounter += 1
  // errors: [] and componentId: null keep validateErrorBrands / validateComponentBrands
  // short-circuiting, so no Error/Component reference rows are needed.
  return {
    model: refs.model,
    serialNumber: `TEST-SN-${serialCounter}`,
    meterBlack: 0,
    meterColour: 0,
    cassettes: 0,
    readiness: refs.readiness,
    countryOfOrigin: refs.country,
    manufacturedYear: null,
    componentId: null,
    coreFunctions: [],
    drumLifeC: 0,
    drumLifeM: 0,
    drumLifeY: 0,
    drumLifeK: 0,
    tonerLifeC: 0,
    tonerLifeM: 0,
    tonerLifeY: 0,
    tonerLifeK: 0,
    errors: [],
    comment: null,
  }
}

export function buildCreateArrivalInput(refs: ArrivalRefs, assetCount = 2): CreateArrival {
  const assets = Array.from({ length: assetCount }, () => buildAsset(refs))
  return CreateArrivalSchema.parse({
    vendor: refs.vendor,
    transporter: refs.transporter,
    warehouse: refs.warehouse,
    comment: null,
    assets,
  })
}

// Create an arrival and return its assets as real AssetSummary objects (status IN_STOCK).
// Collection flows (holds/departures/transfers) operate on existing assets, so tests
// start from genuinely-arrived assets rather than fabricated summaries.
export async function createArrivedAssets(refs: ArrivalRefs, count = 1): Promise<AssetSummary[]> {
  const arrivalNumber = await createArrival(buildCreateArrivalInput(refs, count), refs.userId)
  const { assets } = await getArrival(arrivalNumber)
  return assets
}

export function buildCreateHoldInput(refs: ArrivalRefs, assets: AssetSummary[]): CreateHold {
  return {
    created_for_id: refs.userId,
    customer_id: refs.customer.id,
    notes: null,
    assets: nonEmpty(assets),
  }
}

export function buildCreateDepartureInput(
  refs: ArrivalRefs,
  assets: DepartureAssetInput[],
): CreateDeparture {
  return {
    origin: refs.warehouse,
    customer: refs.customer,
    transporter: refs.transporter,
    comment: null,
    assets: nonEmpty(assets),
  }
}

export function buildCreateTransferInput(
  refs: ArrivalRefs,
  assets: AssetSummary[],
): CreateTransfer {
  return {
    origin: refs.warehouse,
    destination: refs.warehouse2,
    transporter: refs.transporter,
    comment: null,
    assets: nonEmpty(assets),
  }
}

export function buildCreateInvoiceInput(
  refs: ArrivalRefs,
  assets: AssetSummary[],
  invoiceTypeId: number,
  isCleared = false,
): CreateInvoice {
  return {
    invoice_reference: 'TEST-REF',
    organization_id: refs.customer.id,
    invoice_type_id: invoiceTypeId,
    is_cleared: isCleared,
    assets: nonEmpty(assets),
  }
}

export interface AssetCost {
  purchase_cost: number | null
  transport_cost: number | null
  processing_cost: number | null
  other_cost: number | null
  parts_cost: number | null
  total_cost: number | null
  sale_price: number | null
}

// Read an asset's Cost row as plain numbers (assertion helper).
export async function getAssetCost(assetId: number): Promise<AssetCost | null> {
  const cost = await prisma.cost.findUnique({
    where: { asset_id: assetId },
    select: {
      purchase_cost: true,
      transport_cost: true,
      processing_cost: true,
      other_cost: true,
      parts_cost: true,
      total_cost: true,
      sale_price: true,
    },
  })
  if (!cost) return null
  return {
    purchase_cost: cost.purchase_cost?.toNumber() ?? null,
    transport_cost: cost.transport_cost?.toNumber() ?? null,
    processing_cost: cost.processing_cost?.toNumber() ?? null,
    other_cost: cost.other_cost?.toNumber() ?? null,
    parts_cost: cost.parts_cost?.toNumber() ?? null,
    total_cost: cost.total_cost?.toNumber() ?? null,
    sale_price: cost.sale_price?.toNumber() ?? null,
  }
}

// Seed a brand other than the default model brand, for cross-brand validation tests.
export async function seedBrand(name: string): Promise<number> {
  const brand = await prisma.brand.upsert({ where: { name }, create: { name }, update: {} })
  return brand.id
}

export async function seedError(brandId: number, code: string): Promise<number> {
  const error = await prisma.error.upsert({
    where: { brand_id_code: { brand_id: brandId, code } },
    create: { brand_id: brandId, code, category: 'TEST', description: null },
    update: {},
  })
  return error.id
}

export async function seedComponent(brandId: number, name: string): Promise<number> {
  const component = await prisma.component.upsert({
    where: { brand_id_name: { brand_id: brandId, name } },
    create: { brand_id: brandId, name },
    update: {},
  })
  return component.id
}

// A valid UpdateAssetSpecs payload; override individual fields per test.
export function buildUpdateAssetSpecs(
  refs: ArrivalRefs,
  overrides: Partial<UpdateAssetSpecs> = {},
): UpdateAssetSpecs {
  return {
    readiness_id: refs.readiness.id,
    country_of_origin_id: refs.country.id,
    manufactured_year: null,
    cassettes: 0,
    component_id: null,
    meter_black: 0,
    meter_colour: 0,
    drum_life_c: 0,
    drum_life_m: 0,
    drum_life_y: 0,
    drum_life_k: 0,
    toner_life_c: 0,
    toner_life_m: 0,
    toner_life_y: 0,
    toner_life_k: 0,
    accessory_names: [],
    ...overrides,
  }
}

// Read the current status string for an asset by id (assertion helper).
export async function getAssetStatus(assetId: number): Promise<string> {
  const asset = await prisma.asset.findUniqueOrThrow({
    where: { id: assetId },
    select: { status: { select: { status: true } } },
  })
  return asset.status.status
}

// Delete all transactional data in FK-safe order, leaving idempotent reference rows.
export async function cleanupTransactionalData(): Promise<void> {
  await prisma.savedView.deleteMany()
  await prisma.history.deleteMany()
  await prisma.assetStorePart.deleteMany()
  await prisma.storeTransaction.deleteMany()
  await prisma.assetSalvagedPart.deleteMany()
  await prisma.assetTransfer.deleteMany()
  await prisma.assetError.deleteMany()
  await prisma.assetAccessory.deleteMany()
  await prisma.comment.deleteMany()
  await prisma.cost.deleteMany()
  await prisma.technicalSpecification.deleteMany()
  await prisma.file.deleteMany()
  await prisma.asset.deleteMany()
  await prisma.arrival.deleteMany()
  await prisma.departure.deleteMany()
  await prisma.hold.deleteMany()
  await prisma.transfer.deleteMany()
  await prisma.invoice.deleteMany()
  await prisma.storePart.deleteMany()
  await prisma.location.deleteMany()
}
