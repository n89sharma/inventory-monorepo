import { useTransferStore } from '@/data/store/transfer-store'
import type { TransferForm } from '@/ui-types/transfer-form-types'
import { useNavigate } from 'react-router-dom'
import { TransferFormPage } from './transfer-form-page'

export function CreateTransferPage(): React.JSX.Element {
  const navigate = useNavigate()
  const submitCreateTransfer = useTransferStore(state => state.submitCreateTransfer)

  const pageConfig = {
    pageHeading: 'Create Transfer',
    saveButtonText: 'Create Transfer',
    submittingText: 'Creating…',
    cancelNavUrl: '/transfers',
  }

  const breadcrumbs = [
    { label: 'Transfers', href: '/transfers' },
    { label: 'Create' },
  ]

  async function onValidTransferCreateSubmit(data: TransferForm) {
    try {
      const { transferNumber } = await submitCreateTransfer(data)
      navigate(`/transfers/${transferNumber}`, {
        state: { successMessage: `Transfer ${transferNumber} created!` }
      })
    } catch {
      // interceptor already showed the error toast
    }
  }

  return <TransferFormPage pageConfig={pageConfig} breadcrumbs={breadcrumbs} onValidSubmit={onValidTransferCreateSubmit} />
}
