import type { BidDetail } from 'shared-types'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const BID_NUMBER = 'B-0000001'
const DETAIL = { bid_number: BID_NUMBER } as BidDetail
const UNDO_WINDOW_MS = 5000

const mocks = vi.hoisted(() => ({
  removeBidRows: vi.fn(),
  reviewBid: vi.fn(),
  submitBid: vi.fn(),
  updateBidRows: vi.fn(),
  updateBidColumnMappings: vi.fn(),
  uploadBidRows: vi.fn(),
  invalidateBidLists: vi.fn(),
  invalidateBidModelStock: vi.fn(),
  mutate: vi.fn(),
  toastSuccess: vi.fn(),
}))

vi.mock('@/data/api/bid-api', () => ({
  concludeBid: vi.fn(),
  createBid: vi.fn(),
  deleteBid: vi.fn(),
  returnBidToDraft: vi.fn(),
  updateBidMetadata: vi.fn(),
  removeBidRows: mocks.removeBidRows,
  reviewBid: mocks.reviewBid,
  submitBid: mocks.submitBid,
  updateBidRows: mocks.updateBidRows,
  updateBidColumnMappings: mocks.updateBidColumnMappings,
  uploadBidRows: mocks.uploadBidRows,
}))

vi.mock('@/hooks/use-bid', () => ({
  bidDetailKey: (bidNumber: string) => `bid:${bidNumber}`,
  clearBidDetail: vi.fn(),
  invalidateBidLists: mocks.invalidateBidLists,
  invalidateBidModelStock: mocks.invalidateBidModelStock,
}))

vi.mock('swr', () => ({ mutate: mocks.mutate }))

vi.mock('sonner', () => ({ toast: { success: mocks.toastSuccess } }))

async function loadMutations() {
  const { useBidMutations: readMutations } = await import('./use-bid-mutations')
  return readMutations()
}

describe('use-bid-mutations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('refreshes the bid and every list after a status change', async () => {
    const mutations = await loadMutations()
    await mutations.review(BID_NUMBER)
    await mutations.submit(BID_NUMBER)

    expect(mocks.mutate).toHaveBeenCalledWith(`bid:${BID_NUMBER}`)
    expect(mocks.invalidateBidLists).toHaveBeenCalledTimes(2)
  })

  it('puts the returned detail into the cache after a row update without refetching', async () => {
    mocks.updateBidRows.mockResolvedValue(DETAIL)
    const mutations = await loadMutations()
    await mutations.updateRows(BID_NUMBER, { row_ids: [1], selling_price: 100 })

    expect(mocks.mutate).toHaveBeenCalledWith(`bid:${BID_NUMBER}`, DETAIL, { revalidate: false })
    expect(mocks.invalidateBidLists).toHaveBeenCalledOnce()
  })

  it('shows a row as No Bid at once and lets the server reply replace it', async () => {
    const row = {
      id: 7,
      cells: ['S1'],
      selling_price: 1000,
      transport_cost: 30,
      transport_cost_overridden: false,
      margin_percent: 25,
      margin_overridden: false,
      zero_priced: false,
      priced: true,
      bid_price: 720,
      total_cost: 750,
      margin_amount: 250,
    }
    const bid = { ...DETAIL, rows: [row] } as BidDetail
    mocks.updateBidRows.mockResolvedValue(DETAIL)
    const mutations = await loadMutations()
    await mutations.setNoBid(bid, 7, true)

    expect(mocks.updateBidRows).toHaveBeenCalledWith(BID_NUMBER, {
      row_ids: [7],
      zero_priced: true,
    })
    const [key, , options] = mocks.mutate.mock.calls[0] ?? []
    expect(key).toBe(`bid:${BID_NUMBER}`)
    expect(options).toMatchObject({ rollbackOnError: true, populateCache: true, revalidate: false })
    expect(options.optimisticData.rows[0]).toMatchObject({
      zero_priced: true,
      selling_price: null,
      transport_cost: null,
      margin_percent: null,
      bid_price: null,
      total_cost: null,
    })
    expect(mocks.invalidateBidLists).toHaveBeenCalledOnce()
  })

  it('puts the returned detail into the cache after mapping columns', async () => {
    mocks.updateBidColumnMappings.mockResolvedValue(DETAIL)
    const mutations = await loadMutations()
    await mutations.mapColumns(BID_NUMBER, { mappings: [] })

    expect(mocks.mutate).toHaveBeenCalledWith(`bid:${BID_NUMBER}`, DETAIL, { revalidate: false })
    expect(mocks.invalidateBidLists).toHaveBeenCalledOnce()
    expect(mocks.invalidateBidModelStock).toHaveBeenCalledWith(BID_NUMBER)
  })

  it('puts the returned detail into the cache after an upload', async () => {
    mocks.uploadBidRows.mockResolvedValue(DETAIL)
    const mutations = await loadMutations()
    await mutations.upload(BID_NUMBER, { headers: ['Serial'], rows: [['S1']] })

    expect(mocks.mutate).toHaveBeenCalledWith(`bid:${BID_NUMBER}`, DETAIL, { revalidate: false })
    expect(mocks.invalidateBidModelStock).toHaveBeenCalledWith(BID_NUMBER)
  })

  it('hides removed rows at once and deletes them once the undo window passes', async () => {
    vi.useFakeTimers()
    const bid = { ...DETAIL, rows: [{ id: 1 }, { id: 2 }, { id: 3 }] } as BidDetail
    const mutations = await loadMutations()
    mutations.removeRows(BID_NUMBER, [1, 3])

    const [key, hideRemoved] = mocks.mutate.mock.calls[0] ?? []
    expect(key).toBe(`bid:${BID_NUMBER}`)
    expect(hideRemoved(bid).rows).toEqual([{ id: 2 }])
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Removed 2 rows', expect.anything())
    expect(mocks.removeBidRows).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(UNDO_WINDOW_MS)

    expect(mocks.removeBidRows).toHaveBeenCalledWith(BID_NUMBER, { row_ids: [1, 3] })
    expect(mocks.invalidateBidLists).toHaveBeenCalledOnce()
  })

  it('keeps the rows when the removal is undone', async () => {
    vi.useFakeTimers()
    const mutations = await loadMutations()
    mutations.removeRows(BID_NUMBER, [1])
    const [, options] = mocks.toastSuccess.mock.calls[0] ?? []

    options.action.onClick()
    await vi.advanceTimersByTimeAsync(UNDO_WINDOW_MS)

    expect(mocks.removeBidRows).not.toHaveBeenCalled()
    expect(mocks.mutate).toHaveBeenLastCalledWith(`bid:${BID_NUMBER}`)
  })

  it('deletes pending rows at once when the page is left', async () => {
    vi.useFakeTimers()
    const mutations = await loadMutations()
    mutations.removeRows(BID_NUMBER, [1])

    mutations.flushPending(BID_NUMBER)

    expect(mocks.removeBidRows).toHaveBeenCalledWith(BID_NUMBER, { row_ids: [1] })
  })
})
