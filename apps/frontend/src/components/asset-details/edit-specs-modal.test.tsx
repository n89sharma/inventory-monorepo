import { modelLabel } from '@/lib/reference-labels'
import { useAssetStore } from '@/data/store/asset-store'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type {
  AssetDetails,
  AssetError,
  Component,
  ModelSummary,
  SerialNumberCheckResult,
  SerialNumberMatch,
  Status,
  UpdateAssetSpecs,
} from 'shared-types'
import { MemoryRouter } from 'react-router-dom'
import { toast } from 'sonner'
import { SWRConfig } from 'swr'
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { EditSpecsModal } from './edit-specs-modal'

// Only the serial-number lookup is stubbed; the store still reaches the real module for
// everything else it imports from here.
const getSerialNumberMatches = vi.hoisted(() => vi.fn())
vi.mock('@/data/api/asset-api', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return { ...actual, getSerialNumberMatches }
})

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const catalog = vi.hoisted(() => ({
  models: [] as ModelSummary[],
  readinesses: [] as Status[],
  assetComponents: [] as Component[],
}))

vi.mock('@/hooks/use-model', () => ({
  useModels: () => catalog.models,
  invalidateModels: vi.fn(),
}))

vi.mock('@/hooks/use-reference-data', () => ({
  useReadinesses: () => catalog.readinesses,
  useAssetComponents: () => catalog.assetComponents,
  useCountries: () => [],
  useCoreFunctions: () => [],
  useErrorCodes: () => [],
}))

// Four models over two brands: everything the modal derives — applicable fields,
// colour channels, the brand-scoped finisher and errors — follows the picked one.
const COLOUR_CANON: ModelSummary = {
  id: 1,
  brand_id: 1,
  brand_name: 'CANON',
  model_name: 'IRADXC3835I',
  asset_type: 'COPIER',
  weight: 1,
  size: 1,
  is_colour: true,
}
const MONO_CANON: ModelSummary = {
  ...COLOUR_CANON,
  id: 2,
  model_name: 'IRADX4745I',
  is_colour: false,
}
const SECOND_COLOUR_CANON: ModelSummary = { ...COLOUR_CANON, id: 3, model_name: 'IRADXC3830I' }
const COLOUR_RICOH: ModelSummary = {
  ...COLOUR_CANON,
  id: 4,
  brand_id: 2,
  brand_name: 'RICOH',
  model_name: 'MP-C3004',
}
const MODELS = [COLOUR_CANON, MONO_CANON, SECOND_COLOUR_CANON, COLOUR_RICOH]

const HAS_ERRORS: Status = { id: 1, status: 'HAS_ERRORS' }
const UNTESTED: Status = { id: 2, status: 'UNTESTED' }
const PP_OK: Status = { id: 3, status: 'PP_OK' }

const CANON_FINISHER: Component = { id: 7, brand_id: 1, brand_name: 'CANON', name: 'FINISHER-A1' }

const OPEN_ERROR: AssetError = {
  error_id: 11,
  brand_id: 1,
  code: 'E100',
  description: null,
  category: 'TEST',
  is_fixed: false,
  added_at: null,
  added_by: null,
  fixed_at: null,
  fixed_by: null,
}

const COLOUR_SPECS = {
  cassettes: 2,
  internal_finisher: CANON_FINISHER.name,
  internal_finisher_id: CANON_FINISHER.id,
  meter_black: 100,
  meter_colour: 50,
  meter_total: 150,
  drum_life_c: 40,
  drum_life_m: 41,
  drum_life_y: 42,
  drum_life_k: 43,
  toner_life_c: 30,
  toner_life_m: 31,
  toner_life_y: 32,
  toner_life_k: 33,
}

const MONO_SPECS = {
  ...COLOUR_SPECS,
  meter_colour: null,
  meter_total: 100,
  drum_life_c: null,
  drum_life_m: null,
  drum_life_y: null,
  toner_life_c: null,
  toner_life_m: null,
  toner_life_y: null,
}

function buildAssetDetails(model: ModelSummary, overrides: Partial<AssetDetails>): AssetDetails {
  return {
    id: 1,
    barcode: 'BC-1',
    model: model.model_name,
    model_id: model.id,
    is_colour: model.is_colour,
    brand: model.brand_name,
    brand_id: model.brand_id,
    asset_type: model.asset_type,
    serial_number: ASSET_SERIAL,
    status: 'IN_STOCK',
    readiness: HAS_ERRORS.status,
    country_of_origin: null,
    country_of_origin_id: null,
    manufactured_year: null,
    specs: COLOUR_SPECS,
    ...overrides,
  } as AssetDetails
}

const ASSET_BARCODE = 'BC-1'
const ASSET_SERIAL = 'SN-1'
const DUPLICATE_BARCODE = 'YYZ-0000042'
const NEW_SERIAL = 'SN-2'

const NO_SERIAL_MATCHES: SerialNumberCheckResult = {
  matches: [],
  totalMatchCount: 0,
  blockingMatchCount: 0,
}

const IN_STOCK_MATCH: SerialNumberMatch = {
  barcode: DUPLICATE_BARCODE,
  serial_number: NEW_SERIAL,
  brand: 'CANON',
  model: 'IRADXC3835I',
  status: 'IN_STOCK',
  warehouse_code: 'YYZ',
  arrival_number: 'A-YYZ-0000001',
  departure_number: null,
  departed_at: null,
}

const SOLD_MATCH: SerialNumberMatch = {
  ...IN_STOCK_MATCH,
  status: 'SOLD',
  departure_number: 'D-YYZ-0000001',
  departed_at: new Date('2026-01-15T00:00:00.000Z'),
}

// A fresh cache per render and no dedupe window, so each test drives the lookup itself.
const SWR_TEST_OPTIONS = {
  provider: () => new Map(),
  dedupingInterval: 0,
  shouldRetryOnError: false,
  revalidateOnFocus: false,
}

type UpdateAssetSpecsFn = (barcode: string, data: UpdateAssetSpecs) => Promise<void>

function seedStores(updateAssetSpecs: UpdateAssetSpecsFn) {
  catalog.models = MODELS
  catalog.readinesses = [UNTESTED, HAS_ERRORS, PP_OK]
  catalog.assetComponents = [CANON_FINISHER]
  useAssetStore.setState({ updateAssetSpecs })
  getSerialNumberMatches.mockReset()
  getSerialNumberMatches.mockResolvedValue(NO_SERIAL_MATCHES)
}

// The fields have no htmlFor/id pairing, so each control is found through the
// label it sits next to in HorizontalField's grid.
function fieldControl(label: string, selector: string): HTMLElement {
  const row = screen.getByText(label).parentElement
  const control = row?.querySelector(selector)
  if (!(control instanceof HTMLElement)) throw new Error(`No ${selector} next to "${label}"`)
  return control
}

function renderModal(assetDetails: AssetDetails, errors: AssetError[]) {
  render(
    <MemoryRouter>
      <SWRConfig value={SWR_TEST_OPTIONS}>
        <EditSpecsModal
          open
          onOpenChange={vi.fn()}
          assetDetails={assetDetails}
          accessories={[]}
          errors={errors}
        />
      </SWRConfig>
    </MemoryRouter>,
  )
}

// The model field opens on the asset's current model, so it renders as a chip —
// clearing it is what brings the search input back.
function pickModel(model: ModelSummary) {
  fireEvent.click(screen.getByRole('button', { name: 'Clear model' }))
  fireEvent.change(fieldControl('Model', 'input[role="combobox"]'), {
    target: { value: model.model_name },
  })
  fireEvent.click(screen.getByRole('option', { name: modelLabel(model) }))
}

function save() {
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
}

describe('EditSpecsModal', () => {
  let updateAssetSpecs: Mock<UpdateAssetSpecsFn>

  beforeEach(() => {
    vi.clearAllMocks()
    updateAssetSpecs = vi.fn<UpdateAssetSpecsFn>().mockResolvedValue(undefined)
    seedStores(updateAssetSpecs)
  })

  it('releases readiness to Untested and drops the finisher on a brand change', async () => {
    renderModal(buildAssetDetails(COLOUR_CANON, {}), [OPEN_ERROR])

    pickModel(COLOUR_RICOH)
    save()

    await waitFor(() => expect(updateAssetSpecs).toHaveBeenCalledOnce())
    expect(updateAssetSpecs.mock.calls[0][1]).toMatchObject({
      model_id: COLOUR_RICOH.id,
      readiness_id: UNTESTED.id,
      component_id: null,
    })
  })

  it('clears the colour values when a colour asset moves to a mono model', async () => {
    renderModal(buildAssetDetails(COLOUR_CANON, { readiness: PP_OK.status }), [])

    pickModel(MONO_CANON)
    save()

    await waitFor(() => expect(updateAssetSpecs).toHaveBeenCalledOnce())
    expect(updateAssetSpecs.mock.calls[0][1]).toMatchObject({
      model_id: MONO_CANON.id,
      meter_colour: null,
      drum_life_c: null,
      drum_life_m: null,
      drum_life_y: null,
      toner_life_c: null,
      toner_life_m: null,
      toner_life_y: null,
      meter_black: COLOUR_SPECS.meter_black,
      drum_life_k: COLOUR_SPECS.drum_life_k,
      toner_life_k: COLOUR_SPECS.toner_life_k,
    })
  })

  it('requires the colour values when a mono asset moves to a colour model', async () => {
    renderModal(buildAssetDetails(MONO_CANON, { readiness: PP_OK.status, specs: MONO_SPECS }), [])

    pickModel(COLOUR_CANON)
    save()

    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    expect(vi.mocked(toast.error).mock.calls[0][0]).toContain('Drum life C required')
    expect(updateAssetSpecs).not.toHaveBeenCalled()
  })

  it('leaves readiness, the finisher and the consumables alone on a same-brand model change', async () => {
    renderModal(buildAssetDetails(COLOUR_CANON, { readiness: PP_OK.status }), [])

    pickModel(SECOND_COLOUR_CANON)
    save()

    await waitFor(() => expect(updateAssetSpecs).toHaveBeenCalledOnce())
    expect(updateAssetSpecs.mock.calls[0][1]).toMatchObject({
      model_id: SECOND_COLOUR_CANON.id,
      readiness_id: PP_OK.id,
      component_id: CANON_FINISHER.id,
      meter_colour: COLOUR_SPECS.meter_colour,
      drum_life_c: COLOUR_SPECS.drum_life_c,
      drum_life_m: COLOUR_SPECS.drum_life_m,
      drum_life_y: COLOUR_SPECS.drum_life_y,
      drum_life_k: COLOUR_SPECS.drum_life_k,
      toner_life_c: COLOUR_SPECS.toner_life_c,
      toner_life_m: COLOUR_SPECS.toner_life_m,
      toner_life_y: COLOUR_SPECS.toner_life_y,
      toner_life_k: COLOUR_SPECS.toner_life_k,
    })
  })
})

describe('EditSpecsModal duplicate serial numbers', () => {
  // seedStores resets the lookup mock, so the result is applied after it, not before.
  function renderWithSpy(matches: SerialNumberCheckResult = NO_SERIAL_MATCHES): Mock {
    const updateAssetSpecs = vi.fn().mockResolvedValue(undefined)
    seedStores(updateAssetSpecs)
    getSerialNumberMatches.mockResolvedValue(matches)
    renderModal(buildAssetDetails(COLOUR_CANON, { readiness: UNTESTED.status }), [])
    return updateAssetSpecs
  }

  // Only a sold holder leaves the serial reusable; every other status blocks the save outright.
  const BLOCKED_RESULT: SerialNumberCheckResult = {
    matches: [IN_STOCK_MATCH],
    totalMatchCount: 1,
    blockingMatchCount: 1,
  }

  const SOLD_RESULT: SerialNumberCheckResult = {
    matches: [SOLD_MATCH],
    totalMatchCount: 1,
    blockingMatchCount: 0,
  }

  // The debounce plus the SWR round trip can outlast waitFor's default window.
  const CHECK_TIMEOUT_MS = 3000

  function serialInput(): HTMLElement {
    return fieldControl('Serial Number', 'input')
  }

  function enterSerial(value: string) {
    fireEvent.change(serialInput(), { target: { value } })
  }

  function saveButton(): HTMLElement {
    return screen.getByRole('button', { name: 'Save' })
  }

  // The check is debounced off the live field, so Save is disabled from the keystroke until the
  // answer describes what is in the field.
  async function saveWhenReady() {
    await waitFor(() => expect(saveButton()).toBeEnabled(), { timeout: CHECK_TIMEOUT_MS })
    fireEvent.click(saveButton())
  }

  // Without the exclusion an asset would always collide with itself and could never be saved.
  it('excludes the asset itself from its own lookup', async () => {
    renderWithSpy()

    enterSerial(NEW_SERIAL)

    await waitFor(() =>
      expect(getSerialNumberMatches).toHaveBeenCalledWith(NEW_SERIAL, ASSET_BARCODE),
    )
  })

  it('links to the asset already holding the serial', async () => {
    renderWithSpy(BLOCKED_RESULT)

    enterSerial(NEW_SERIAL)

    expect(await screen.findByRole('link', { name: DUPLICATE_BARCODE })).toHaveAttribute(
      'href',
      `/assets/${DUPLICATE_BARCODE}`,
    )
  })

  it('blocks the save when the serial is held by an asset that was not sold on', async () => {
    const updateAssetSpecs = renderWithSpy(BLOCKED_RESULT)

    enterSerial(NEW_SERIAL)

    expect(
      await screen.findByText(/This serial number is already on an asset in the system/),
    ).toBeVisible()
    expect(saveButton()).toBeDisabled()
    expect(updateAssetSpecs).not.toHaveBeenCalled()
  })

  it('asks for confirmation instead of saving a duplicate of a sold asset', async () => {
    const updateAssetSpecs = renderWithSpy(SOLD_RESULT)

    enterSerial(NEW_SERIAL)
    await screen.findByRole('link', { name: DUPLICATE_BARCODE })
    await saveWhenReady()

    expect(await screen.findByText('Duplicate serial number')).toBeVisible()
    expect(updateAssetSpecs).not.toHaveBeenCalled()
  })

  it('saves with the acknowledgment once the duplicate is confirmed', async () => {
    const updateAssetSpecs = renderWithSpy(SOLD_RESULT)

    enterSerial(NEW_SERIAL)
    await screen.findByRole('link', { name: DUPLICATE_BARCODE })
    await saveWhenReady()
    await screen.findByText('Duplicate serial number')
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Duplicate' }))

    await waitFor(() => expect(updateAssetSpecs).toHaveBeenCalledOnce())
    expect(updateAssetSpecs.mock.calls[0][1]).toMatchObject({
      serial_number: NEW_SERIAL,
      duplicate_serial_acknowledged: true,
    })
  })

  it('saves straight through when nothing matches', async () => {
    const updateAssetSpecs = renderWithSpy()

    enterSerial(NEW_SERIAL)
    await waitFor(() => expect(getSerialNumberMatches).toHaveBeenCalled())
    await saveWhenReady()

    await waitFor(() => expect(updateAssetSpecs).toHaveBeenCalledOnce())
    expect(updateAssetSpecs.mock.calls[0][1]).toMatchObject({
      duplicate_serial_acknowledged: false,
    })
  })

  // An update only has to justify a serial it actually changes. Without this an asset that
  // already shares a serial — after a return to stock, say — could never save any other edit.
  it('does not check or gate the asset own unchanged serial', async () => {
    const updateAssetSpecs = renderWithSpy(BLOCKED_RESULT)

    await saveWhenReady()

    await waitFor(() => expect(updateAssetSpecs).toHaveBeenCalledOnce())
    expect(getSerialNumberMatches).not.toHaveBeenCalled()
  })

  it('stops gating once the serial is typed back to the persisted one', async () => {
    renderWithSpy(BLOCKED_RESULT)

    enterSerial(NEW_SERIAL)
    await screen.findByText(/This serial number is already on an asset in the system/)
    expect(saveButton()).toBeDisabled()

    enterSerial(ASSET_SERIAL)

    await waitFor(() => expect(saveButton()).toBeEnabled(), { timeout: CHECK_TIMEOUT_MS })
  })
})
