import { getInvoiceDetail } from '@/data/api/invoice-api'
import useSWR, { preload } from 'swr'

export const invoiceDetailKey = (invoiceNumber: string) => `invoice:${invoiceNumber}`

export function useInvoiceDetail(invoiceNumber: string) {
  return useSWR(invoiceDetailKey(invoiceNumber), () => getInvoiceDetail(invoiceNumber))
}

export function preloadInvoiceDetail(invoiceNumber: string) {
  preload(invoiceDetailKey(invoiceNumber), () => getInvoiceDetail(invoiceNumber))
}
