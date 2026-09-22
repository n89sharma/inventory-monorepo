import { useCan } from '@/hooks/use-can'

// Purchase and sale totals are shown together or not at all, so both permissions gate as one.
export function useCanViewCosts(): boolean {
  const can = useCan()
  return can('view_purchase_price') && can('view_sale_price')
}
