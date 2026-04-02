import { useConstantsStore } from '@/data/store/constants-store'
import { useOrgStore } from '@/data/store/org-store'
import { useTransferStore } from '@/data/store/transfer-store'
import type { TransferForm } from '@/ui-types/transfer-form-types'
import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { TransferFormPage } from './transfer-form-page'

export function UpdateTransferPage(): React.JSX.Element {
  const { collectionId: transferNumber } = useParams<{ collectionId: string }>()
  const navigate = useNavigate()

  const transferFormData = useTransferStore(state => state.transferFormData)
  const getTransferForUpdate = useTransferStore(state => state.getTransferForUpdate)
  const submitUpdateTransfer = useTransferStore(state => state.submitUpdateTransfer)

  const orgs = useOrgStore(state => state.organizations)
  const warehouses = useConstantsStore(state => state.warehouses)

  useEffect(() => {
    if (!transferNumber) return
    if (!orgs.length || !warehouses.length) return
    getTransferForUpdate(transferNumber)
  }, [transferNumber, orgs.length, warehouses.length])

  const pageConfig = {
    pageHeading: `Edit Transfer ${transferNumber}`,
    saveButtonText: 'Save Changes',
    submittingText: 'Saving...',
    cancelNavUrl: `/transfers/${transferNumber}`,
  }

  const breadcrumbs = [
    { label: 'Transfers', href: '/transfers' },
    { label: transferNumber!, href: `/transfers/${transferNumber}` },
    { label: 'Edit' },
  ]

  async function onValidTransferUpdateSubmit(transferForm: TransferForm) {
    try {
      const res = await submitUpdateTransfer(transferNumber!, transferForm)
      if (res.success) {
        navigate(`/transfers/${transferNumber}`, {
          state: { successMessage: `Transfer ${transferNumber} updated!` }
        })
      }
    } catch {
      toast.error('Something went wrong on the server.', { position: 'top-center' })
    }
  }

  if (!transferFormData) return <div>Loading…</div>
  return <TransferFormPage
    defaultValues={transferFormData}
    pageConfig={pageConfig}
    breadcrumbs={breadcrumbs}
    onValidSubmit={onValidTransferUpdateSubmit}
  />
}
