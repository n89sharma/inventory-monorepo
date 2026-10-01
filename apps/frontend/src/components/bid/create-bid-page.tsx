import { BidFormPage } from '@/components/bid/bid-form-page'
import { useBidMutations } from '@/hooks/use-bid-mutations'
import { showEntityCreatedToast } from '@/lib/success-toast'
import type { BidForm } from '@/ui-types/bid-form-types'
import { useNavigate } from 'react-router-dom'

const PAGE_CONFIG = {
  pageHeading: 'Create Bid',
  saveButtonText: 'Save',
  submittingText: 'Saving…',
  cancelNavUrl: '/bids',
}

const BREADCRUMBS = [{ label: 'Purchases', href: '/bids' }, { label: 'Create' }]

export function CreateBidPage(): React.JSX.Element {
  const navigate = useNavigate()
  const mutations = useBidMutations()

  async function onValidBidCreateSubmit(data: BidForm) {
    try {
      const { bidNumber } = await mutations.create(data)
      showEntityCreatedToast({ entity: 'bid', id: bidNumber })
      navigate(`/bids/${bidNumber}`)
    } catch {
      // interceptor already showed the error toast
    }
  }

  return (
    <BidFormPage
      pageConfig={PAGE_CONFIG}
      breadcrumbs={BREADCRUMBS}
      onValidSubmit={onValidBidCreateSubmit}
    />
  )
}
