import { useAssetStore } from '@/data/store/asset-store'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type {
  AssetSummary,
  Component,
  Error as ReferenceError,
  ModelSummary,
  SerialNumberCheckResult,
  SerialNumberMatch,
  Status,
} from 'shared-types'
import { SWRConfig } from 'swr'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CreateAssetModal } from './create-asset-modal'

// Only the serial-number lookup is stubbed; the store still reaches the real module for
// everything else it imports from here.
const getSerialNumberMatches = vi.hoisted(() => vi.fn())
vi.mock('@/data/api/asset-api', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return { ...actual, getSerialNumberMatches }
})

const catalog = vi.hoisted(() => ({
  models: [] as ModelSummary[],
  readinesses: [] as Status[],
  errorCodes: [] as ReferenceError[],
  assetComponents: [] as Component[],
}))

vi.mock('@/hooks/use-model', () => ({
  useModels: () => catalog.models,
  invalidateModels: vi.fn(),
}))

vi.mock('@/hooks/use-reference-data', () => ({
  useReadinesses: () => catalog.readinesses,
  useErrorCodes: () => catalog.errorCodes,
  useAssetComponents: () => catalog.assetComponents,
  useCountries: () => [],
  useCoreFunctions: () => [],
}))

// A supplies model carries no meter, cassette or consumable fields, so the form
// is valid with nothing but a model and a serial number.
const MODEL: ModelSummary = {
  id: 1,
  brand_id: 1,
  brand_name: 'CANON',
  model_name: 'PALLET',
  asset_type_id: 1,
  asset_type: 'WAREHOUSE_SUPPLIES',
  weight: 0,
  size: 0,
  is_colour: false,
}
const MODEL_LABEL = 'CANON PALLET'
// A second brand's model, so switching between the two crosses a brand boundary.
const RICOH_MODEL: ModelSummary = {
  ...MODEL,
  id: 2,
  brand_id: 2,
  brand_name: 'RICOH',
  model_name: 'CRATE',
}
const RICOH_MODEL_LABEL = 'RICOH CRATE'
const UNTESTED: Status = { id: 1, status: 'UNTESTED' }
const HAS_ERRORS: Status = { id: 2, status: 'HAS_ERRORS' }
const CANON_ERROR: ReferenceError = {
  id: 5,
  brand_id: 1,
  code: 'E100',
  description: null,
  category: 'TEST',
}
// The readiness picker labels its pills with the display text from readiness-config.
const UNTESTED_DISPLAY = 'Untested'
const HAS_ERRORS_DISPLAY = 'Has errors'
const CREATED_ASSET = { id: 10, barcode: 'BC-10' } as AssetSummary
const SERIAL = 'SN-FIRST'
const PUNCTUATED_SERIAL = 'sn first'
const OTHER_SERIAL = 'SN-SECOND'
const DUPLICATE_BARCODE = 'YYZ-0000042'

const NO_SERIAL_MATCHES: SerialNumberCheckResult = {
  matches: [],
  totalMatchCount: 0,
  blockingMatchCount: 0,
}

const IN_STOCK_MATCH: SerialNumberMatch = {
  barcode: DUPLICATE_BARCODE,
  serial_number: SERIAL,
  brand: 'CANON',
  model: 'PALLET',
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

// A fresh cache per render and no dedupe window, so each test drives the lookup itself.
const SWR_TEST_OPTIONS = {
  provider: () => new Map(),
  dedupingInterval: 0,
  shouldRetryOnError: false,
  revalidateOnFocus: false,
}

function seedStores() {
  catalog.models = [MODEL, RICOH_MODEL]
  catalog.readinesses = [UNTESTED, HAS_ERRORS]
  catalog.errorCodes = [CANON_ERROR]
  catalog.assetComponents = []
  useAssetStore.setState({ printBarcodes: vi.fn().mockResolvedValue(undefined) })
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

function serialInput(): HTMLInputElement {
  const input = fieldControl('Serial Number', 'input')
  if (!(input instanceof HTMLInputElement)) throw new Error('Expected a serial number input')
  return input
}

function renderModal(
  onCreateAsset: (asset: unknown) => Promise<AssetSummary>,
  extraProps: Partial<React.ComponentProps<typeof CreateAssetModal>> = {},
) {
  const onOpenChange = vi.fn()
  const modal = (open: boolean) => (
    <MemoryRouter>
      <SWRConfig value={SWR_TEST_OPTIONS}>
        <CreateAssetModal
          open={open}
          onOpenChange={onOpenChange}
          onCreateAsset={onCreateAsset as never}
          {...extraProps}
        />
      </SWRConfig>
    </MemoryRouter>
  )
  // The modal stays mounted while the page toggles `open`, which is what makes a
  // form that never clears itself visible on the next open.
  const { rerender } = render(modal(true))
  return {
    onOpenChange,
    reopen: () => {
      rerender(modal(false))
      rerender(modal(true))
    },
  }
}

// Changing an already-picked model means clearing the chip first, which takes the
// brand through null before the new one arrives.
function pickModel(label = MODEL_LABEL) {
  const chip = screen.queryByRole('button', { name: 'Clear model' })
  if (chip) fireEvent.click(chip)
  fireEvent.change(fieldControl('Model', 'input[role="combobox"]'), {
    target: { value: label.split(' ')[1] },
  })
  fireEvent.click(screen.getByRole('option', { name: label }))
}

function pickReadiness(display: string) {
  fireEvent.click(screen.getByText(display))
}

function addOpenError() {
  pickReadiness(HAS_ERRORS_DISPLAY)
  fireEvent.change(fieldControl('Errors', 'input[role="combobox"]'), {
    target: { value: CANON_ERROR.code },
  })
  fireEvent.click(screen.getByRole('option', { name: CANON_ERROR.code }))
}

describe('CreateAssetModal', () => {
  beforeEach(seedStores)

  it('opens blank again after an asset is created', async () => {
    const onCreateAsset = vi.fn().mockResolvedValue(CREATED_ASSET)
    const { onOpenChange, reopen } = renderModal(onCreateAsset)

    pickModel()
    fireEvent.change(serialInput(), { target: { value: SERIAL } })
    await saveWhenReady()

    await waitFor(() => expect(onCreateAsset).toHaveBeenCalledOnce())
    expect(onCreateAsset.mock.calls[0][0]).toMatchObject({ serialNumber: SERIAL, model: MODEL })
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))

    reopen()

    expect(serialInput()).toHaveValue('')
    expect(screen.queryByText(MODEL_LABEL)).not.toBeInTheDocument()
  })

  it('opens blank again after the edits are discarded', async () => {
    const onCreateAsset = vi.fn().mockResolvedValue(CREATED_ASSET)
    const { onOpenChange, reopen } = renderModal(onCreateAsset)

    pickModel()
    fireEvent.change(serialInput(), { target: { value: SERIAL } })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Discard' }))

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
    expect(onCreateAsset).not.toHaveBeenCalled()

    reopen()

    expect(serialInput()).toHaveValue('')
    expect(screen.queryByText(MODEL_LABEL)).not.toBeInTheDocument()
  })

  it('clears the errors when the model moves to another brand', async () => {
    renderModal(vi.fn().mockResolvedValue(CREATED_ASSET))

    pickModel()
    addOpenError()
    expect(screen.getByRole('button', { name: `Remove error ${CANON_ERROR.code}` })).toBeVisible()

    pickModel(RICOH_MODEL_LABEL)

    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: `Remove error ${CANON_ERROR.code}` }),
      ).not.toBeInTheDocument(),
    )
  })

  it('clears the errors when the readiness leaves Has errors', async () => {
    renderModal(vi.fn().mockResolvedValue(CREATED_ASSET))

    pickModel()
    addOpenError()
    expect(screen.getByRole('button', { name: `Remove error ${CANON_ERROR.code}` })).toBeVisible()

    pickReadiness(UNTESTED_DISPLAY)

    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: `Remove error ${CANON_ERROR.code}` }),
      ).not.toBeInTheDocument(),
    )
  })

  it('keeps the errors when the model is re-picked within the same brand', async () => {
    renderModal(vi.fn().mockResolvedValue(CREATED_ASSET))

    pickModel()
    addOpenError()

    pickModel()

    expect(screen.getByRole('button', { name: `Remove error ${CANON_ERROR.code}` })).toBeVisible()
  })

  it('keeps the form open with the typed values when the create fails', async () => {
    const onCreateAsset = vi.fn().mockRejectedValue(new Error('rejected'))
    const { onOpenChange } = renderModal(onCreateAsset)

    pickModel()
    fireEvent.change(serialInput(), { target: { value: SERIAL } })
    await saveWhenReady()

    await waitFor(() => expect(onCreateAsset).toHaveBeenCalledOnce())
    expect(onOpenChange).not.toHaveBeenCalled()
    expect(serialInput()).toHaveValue(SERIAL)
  })
})

function enterSerial(value: string) {
  fireEvent.change(serialInput(), { target: { value } })
}

// The debounce plus the SWR round trip can outlast waitFor's default window.
const CHECK_TIMEOUT_MS = 3000

function saveButton(): HTMLElement {
  return screen.getByRole('button', { name: 'Save Asset' })
}

// The check is debounced off the live field, so Save is disabled from the keystroke until the
// answer describes what is in the field. Every save waits that out rather than racing it.
async function saveWhenReady() {
  await waitFor(() => expect(saveButton()).toBeEnabled(), { timeout: CHECK_TIMEOUT_MS })
  fireEvent.click(saveButton())
}

function confirmDuplicate() {
  fireEvent.click(screen.getByRole('button', { name: 'Confirm Duplicate' }))
}

describe('CreateAssetModal duplicate serial numbers', () => {
  beforeEach(seedStores)

  it('warns when the serial is already on a draft asset, ignoring punctuation', async () => {
    renderModal(vi.fn().mockResolvedValue(CREATED_ASSET), {
      draftSerialNumbers: [SERIAL],
    })

    pickModel()
    enterSerial(PUNCTUATED_SERIAL)

    expect(
      await screen.findByText('This serial number is already on an asset in this arrival.'),
    ).toBeVisible()
  })

  // A serial can collide with both an unsaved sibling and a persisted asset; neither warning
  // suppresses the other.
  it('warns about a draft and a persisted collision together', async () => {
    getSerialNumberMatches.mockResolvedValue(SOLD_RESULT)
    renderModal(vi.fn().mockResolvedValue(CREATED_ASSET), { draftSerialNumbers: [SERIAL] })

    pickModel()
    enterSerial(SERIAL)

    expect(
      await screen.findByText('This serial number is already on an asset in this arrival.'),
    ).toBeVisible()
    expect(await screen.findByRole('link', { name: DUPLICATE_BARCODE })).toBeVisible()
  })

  // Both rows of an arrival are created IN_STOCK, so an unsaved sibling is the forbidden case
  // arriving a moment early — there is nothing to acknowledge.
  it('blocks the save on a draft collision', async () => {
    const onCreateAsset = vi.fn().mockResolvedValue(CREATED_ASSET)
    renderModal(onCreateAsset, { draftSerialNumbers: [SERIAL] })

    pickModel()
    enterSerial(SERIAL)
    await screen.findByText('This serial number is already on an asset in this arrival.')

    await waitFor(() => expect(saveButton()).toBeDisabled(), { timeout: CHECK_TIMEOUT_MS })
    expect(onCreateAsset).not.toHaveBeenCalled()
  })

  it('blocks the save when the serial is held by an asset that was not sold on', async () => {
    getSerialNumberMatches.mockResolvedValue(BLOCKED_RESULT)
    const onCreateAsset = vi.fn().mockResolvedValue(CREATED_ASSET)
    renderModal(onCreateAsset)

    pickModel()
    enterSerial(SERIAL)

    expect(
      await screen.findByText(/This serial number is already on an asset in the system/),
    ).toBeVisible()
    await waitFor(() => expect(saveButton()).toBeDisabled(), { timeout: CHECK_TIMEOUT_MS })
    expect(screen.queryByText('Duplicate serial number')).not.toBeInTheDocument()
  })

  it('re-enables the save once the blocking serial is edited away', async () => {
    getSerialNumberMatches.mockResolvedValueOnce(BLOCKED_RESULT)
    renderModal(vi.fn().mockResolvedValue(CREATED_ASSET))

    pickModel()
    enterSerial(SERIAL)
    // Wait for the answer, not merely for the disabled state — the debounce alone disables Save.
    await screen.findByText(/This serial number is already on an asset in the system/)
    expect(saveButton()).toBeDisabled()

    getSerialNumberMatches.mockResolvedValue(NO_SERIAL_MATCHES)
    enterSerial(OTHER_SERIAL)

    await waitFor(() => expect(saveButton()).toBeEnabled(), { timeout: CHECK_TIMEOUT_MS })
  })

  it('links to the existing asset when the serial is already in the system', async () => {
    getSerialNumberMatches.mockResolvedValue(BLOCKED_RESULT)
    renderModal(vi.fn().mockResolvedValue(CREATED_ASSET))

    pickModel()
    enterSerial(SERIAL)

    const link = await screen.findByRole('link', { name: DUPLICATE_BARCODE })
    expect(link).toHaveAttribute('href', `/assets/${DUPLICATE_BARCODE}`)
  })

  it('uses softer wording for a serial that was sold on', async () => {
    getSerialNumberMatches.mockResolvedValue(SOLD_RESULT)
    renderModal(vi.fn().mockResolvedValue(CREATED_ASSET))

    pickModel()
    enterSerial(SERIAL)

    expect(await screen.findByText(/previously sold and departed/)).toBeVisible()
    expect(screen.queryByText(/already on an asset in the system/)).not.toBeInTheDocument()
  })

  it('reports the matches it could not list', async () => {
    getSerialNumberMatches.mockResolvedValue({
      matches: [SOLD_MATCH, SOLD_MATCH, SOLD_MATCH],
      totalMatchCount: 7,
      blockingMatchCount: 0,
    })
    renderModal(vi.fn().mockResolvedValue(CREATED_ASSET))

    pickModel()
    enterSerial(SERIAL)

    expect(await screen.findByText('and 4 more')).toBeVisible()
  })

  it('asks for confirmation instead of saving a duplicate of a sold asset', async () => {
    getSerialNumberMatches.mockResolvedValue(SOLD_RESULT)
    const onCreateAsset = vi.fn().mockResolvedValue(CREATED_ASSET)
    renderModal(onCreateAsset)

    pickModel()
    enterSerial(SERIAL)
    await screen.findByRole('link', { name: DUPLICATE_BARCODE })
    await saveWhenReady()

    expect(await screen.findByText('Duplicate serial number')).toBeVisible()
    expect(onCreateAsset).not.toHaveBeenCalled()
  })

  // Validation gates the prompt: an acknowledgment given on a form that cannot be saved would
  // still be spent when the form finally is, so the save would go through unconfirmed.
  it('reports the missing fields before asking about the duplicate', async () => {
    getSerialNumberMatches.mockResolvedValue(SOLD_RESULT)
    const onCreateAsset = vi.fn().mockResolvedValue(CREATED_ASSET)
    renderModal(onCreateAsset)

    enterSerial(SERIAL)
    await screen.findByRole('link', { name: DUPLICATE_BARCODE })
    await saveWhenReady()

    await waitFor(() =>
      expect(fieldControl('Model', 'input[role="combobox"]')).toHaveAttribute(
        'aria-invalid',
        'true',
      ),
    )
    expect(screen.queryByText('Duplicate serial number')).not.toBeInTheDocument()

    pickModel()
    await saveWhenReady()

    expect(await screen.findByText('Duplicate serial number')).toBeVisible()
    expect(onCreateAsset).not.toHaveBeenCalled()
  })

  // Nothing is acknowledged in advance, so a save that failed leaves no spent confirmation behind.
  it('asks again on the save that follows a failed one', async () => {
    getSerialNumberMatches.mockResolvedValue(SOLD_RESULT)
    const onCreateAsset = vi.fn().mockRejectedValue(new Error('rejected'))
    renderModal(onCreateAsset)

    pickModel()
    enterSerial(SERIAL)
    await screen.findByRole('link', { name: DUPLICATE_BARCODE })
    await saveWhenReady()
    await screen.findByText('Duplicate serial number')
    confirmDuplicate()
    await waitFor(() => expect(onCreateAsset).toHaveBeenCalledOnce())

    await saveWhenReady()

    expect(await screen.findByText('Duplicate serial number')).toBeVisible()
    expect(onCreateAsset).toHaveBeenCalledOnce()
  })

  it('saves with the acknowledgment once the duplicate is confirmed', async () => {
    getSerialNumberMatches.mockResolvedValue(SOLD_RESULT)
    const onCreateAsset = vi.fn().mockResolvedValue(CREATED_ASSET)
    renderModal(onCreateAsset)

    pickModel()
    enterSerial(SERIAL)
    await screen.findByRole('link', { name: DUPLICATE_BARCODE })
    await saveWhenReady()
    await screen.findByText('Duplicate serial number')
    confirmDuplicate()

    await waitFor(() => expect(onCreateAsset).toHaveBeenCalledOnce())
    expect(onCreateAsset.mock.calls[0][0]).toMatchObject({
      serialNumber: SERIAL,
      duplicateSerialAcknowledged: true,
    })
  })

  // Cancelling the prompt acknowledges nothing, so the next save asks again.
  it('asks again when the serial changes after the prompt is cancelled', async () => {
    getSerialNumberMatches.mockResolvedValue(SOLD_RESULT)
    const onCreateAsset = vi.fn().mockResolvedValue(CREATED_ASSET)
    renderModal(onCreateAsset)

    pickModel()
    enterSerial(SERIAL)
    await screen.findByRole('link', { name: DUPLICATE_BARCODE })
    await saveWhenReady()
    await screen.findByText('Duplicate serial number')
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    enterSerial(OTHER_SERIAL)
    await saveWhenReady()

    expect(await screen.findByText('Duplicate serial number')).toBeVisible()
    expect(onCreateAsset).not.toHaveBeenCalled()
  })

  it('saves straight through when nothing matches', async () => {
    const onCreateAsset = vi.fn().mockResolvedValue(CREATED_ASSET)
    renderModal(onCreateAsset)

    pickModel()
    enterSerial(SERIAL)
    await waitFor(() => expect(getSerialNumberMatches).toHaveBeenCalled())
    await saveWhenReady()

    await waitFor(() => expect(onCreateAsset).toHaveBeenCalledOnce())
    expect(onCreateAsset.mock.calls[0][0]).toMatchObject({ duplicateSerialAcknowledged: false })
    expect(screen.queryByText('Duplicate serial number')).not.toBeInTheDocument()
  })

  // An update only has to justify a serial it actually changes, so the asset stays editable.
  it('runs no lookup while a persisted asset keeps its own serial', async () => {
    getSerialNumberMatches.mockResolvedValue(BLOCKED_RESULT)
    renderModal(vi.fn().mockResolvedValue(CREATED_ASSET), {
      persistedAsset: { barcode: DUPLICATE_BARCODE, serialNumber: SERIAL },
    })

    pickModel()
    enterSerial(SERIAL)

    await expect.poll(() => getSerialNumberMatches.mock.calls.length).toBe(0)
    await waitFor(() => expect(saveButton()).toBeEnabled(), { timeout: CHECK_TIMEOUT_MS })
  })

  it('excludes the edited asset from its own lookup', async () => {
    renderModal(vi.fn().mockResolvedValue(CREATED_ASSET), {
      persistedAsset: { barcode: DUPLICATE_BARCODE, serialNumber: OTHER_SERIAL },
    })

    pickModel()
    enterSerial(SERIAL)

    await waitFor(() =>
      expect(getSerialNumberMatches).toHaveBeenCalledWith(SERIAL, DUPLICATE_BARCODE),
    )
  })
})
