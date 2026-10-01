import type { BidDetail } from 'shared-types'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const BID_NUMBER = 'B-0000001'
const DETAIL = { bid_number: BID_NUMBER } as BidDetail

const mocks = vi.hoisted(() => ({
  reviewBid: vi.fn(),
  submitBid: vi.fn(),
  updateBidRows: vi.fn(),
  uploadBidRows: vi.fn(),
  invalidateBidLists: vi.fn(),
  mutate: vi.fn(),
}))

vi.mock('@/data/api/bid-api', () => ({
  concludeBid: vi.fn(),
  createBid: vi.fn(),
  deleteBid: vi.fn(),
  returnBidToDraft: vi.fn(),
  updateBidMetadata: vi.fn(),
  reviewBid: mocks.reviewBid,
  submitBid: mocks.submitBid,
  updateBidRows: mocks.updateBidRows,
  uploadBidRows: mocks.uploadBidRows,
}))

vi.mock('@/hooks/use-bid', () => ({
  bidDetailKey: (bidNumber: string) => `bid:${bidNumber}`,
  clearBidDetail: vi.fn(),
  invalidateBidLists: mocks.invalidateBidLists,
}))

vi.mock('swr', () => ({ mutate: mocks.mutate }))

async function loadMutations() {
  const { useBidMutations: readMutations } = await import('./use-bid-mutations')
  return readMutations()
}

describe('use-bid-mutations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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

  it('puts the returned detail into the cache after an upload', async () => {
    mocks.uploadBidRows.mockResolvedValue(DETAIL)
    const mutations = await loadMutations()
    await mutations.upload(BID_NUMBER, { headers: ['Serial'], rows: [['S1']] })

    expect(mocks.mutate).toHaveBeenCalledWith(`bid:${BID_NUMBER}`, DETAIL, { revalidate: false })
  })
})
