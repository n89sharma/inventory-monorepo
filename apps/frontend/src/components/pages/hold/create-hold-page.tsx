import { useHoldStore } from '@/data/store/hold-store'
import type { HoldForm } from '@/ui-types/hold-form-types'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { HoldFormPage } from './hold-form-page'

export function CreateHoldPage(): React.JSX.Element {
  const navigate = useNavigate()
  const submitCreateHold = useHoldStore(state => state.submitCreateHold)

  const pageConfig = {
    pageHeading: 'Create Hold',
    saveButtonText: 'Create Hold',
    submittingText: 'Creating...',
    cancelNavUrl: '/holds',
  }

  const breadcrumbs = [
    { label: 'Holds', href: '/holds' },
    { label: 'Create' },
  ]

  async function onValidHoldCreateSubmit(data: HoldForm) {
    try {
      const res = await submitCreateHold(data)
      if (res.success) {
        navigate(`/holds/${res.data.holdNumber}`, {
          state: { successMessage: `Hold ${res.data.holdNumber} created!` }
        })
      } else {
        toast.error(res.error.summary, { position: 'top-center' })
      }
    } catch {
      toast.error('Something went wrong on the server.', { position: 'top-center' })
    }
  }

  return <HoldFormPage pageConfig={pageConfig} breadcrumbs={breadcrumbs} onValidSubmit={onValidHoldCreateSubmit} />
}
