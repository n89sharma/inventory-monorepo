import { modelLabel } from '@/lib/reference-labels'
import { useAssetStore } from '@/data/store/asset-store'
import { useModelStore } from '@/data/store/model-store'
import { useReferenceDataStore } from '@/data/store/reference-data-store'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type {
  AssetDetails,
  AssetError,
  Component,
  ModelSummary,
  Status,
  UpdateAssetSpecs,
} from 'shared-types'
import { toast } from 'sonner'
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { EditSpecsModal } from './edit-specs-modal'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

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
    serial_number: 'SN-1',
    status: 'IN_STOCK',
    readiness: HAS_ERRORS.status,
    country_of_origin: null,
    country_of_origin_id: null,
    manufactured_year: null,
    specs: COLOUR_SPECS,
    ...overrides,
  } as AssetDetails
}

type UpdateAssetSpecsFn = (barcode: string, data: UpdateAssetSpecs) => Promise<void>

function seedStores(updateAssetSpecs: UpdateAssetSpecsFn) {
  useModelStore.setState({ models: MODELS })
  useReferenceDataStore.setState({
    readinesses: [UNTESTED, HAS_ERRORS, PP_OK],
    countries: [],
    components: [CANON_FINISHER],
    coreFunctions: [],
    errors: [],
  })
  useAssetStore.setState({ updateAssetSpecs })
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
    <EditSpecsModal
      open
      onOpenChange={vi.fn()}
      assetDetails={assetDetails}
      accessories={[]}
      errors={errors}
    />,
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
