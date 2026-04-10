import { useTransferStore } from '@/data/store/transfer-store'
import type { TransferForm } from '@/ui-types/transfer-form-types'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
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
      const res = await submitCreateTransfer(data)
      if (res.success) {
        navigate(`/transfers/${res.data.transferNumber}`, {
          state: { successMessage: `Transfer ${res.data.transferNumber} created!` }
        })
      }
    } catch {
      toast.error('Something went wrong on the server.', { position: 'top-center' })
    }
  }

  return <TransferFormPage pageConfig={pageConfig} breadcrumbs={breadcrumbs} onValidSubmit={onValidTransferCreateSubmit} />
}
