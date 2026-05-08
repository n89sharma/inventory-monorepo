import { useHoldStore } from '@/data/store/hold-store'
import type { HoldForm } from '@/ui-types/hold-form-types'
import { useNavigate } from 'react-router-dom'
import { HoldFormPage } from './hold-form-page'

export function CreateHoldPage(): React.JSX.Element {
  const navigate = useNavigate()
  const submitCreateHold = useHoldStore(state => state.submitCreateHold)

  const pageConfig = {
    pageHeading: 'Create Hold',
    saveButtonText: 'Create Hold',
    submittingText: 'Creating…',
    cancelNavUrl: '/holds',
  }

  const breadcrumbs = [
    { label: 'Holds', href: '/holds' },
    { label: 'Create' },
  ]

  async function onValidHoldCreateSubmit(data: HoldForm) {
    try {
      const { holdNumber } = await submitCreateHold(data)
      navigate(`/holds/${holdNumber}`, {
        state: { successMessage: `Hold ${holdNumber} created!` }
      })
    } catch {
      // interceptor already showed the error toast
    }
  }

  return <HoldFormPage pageConfig={pageConfig} breadcrumbs={breadcrumbs} onValidSubmit={onValidHoldCreateSubmit} />
}
