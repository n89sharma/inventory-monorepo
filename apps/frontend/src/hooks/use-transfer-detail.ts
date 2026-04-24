import { getTransferDetail } from '@/data/api/transfer-api'
import useSWR, { preload } from 'swr'

export const transferDetailKey = (transferNumber: string) => `transfer:${transferNumber}`

export function useTransferDetail(transferNumber: string) {
  return useSWR(transferDetailKey(transferNumber), () => getTransferDetail(transferNumber))
}

export function preloadTransferDetail(transferNumber: string) {
  preload(transferDetailKey(transferNumber), () => getTransferDetail(transferNumber))
}
