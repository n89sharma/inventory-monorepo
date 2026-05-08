import { useHoldStore } from '@/data/store/hold-store'
import type { HoldForm } from '@/ui-types/hold-form-types'
import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { HoldFormPage } from './hold-form-page'

export function UpdateHoldPage(): React.JSX.Element {
  const { collectionId: holdNumber } = useParams<{ collectionId: string }>()
  const navigate = useNavigate()

  const holdFormData = useHoldStore(state => state.holdFormData)
  const getHoldForUpdate = useHoldStore(state => state.getHoldForUpdate)
  const submitUpdateHold = useHoldStore(state => state.submitUpdateHold)

  useEffect(() => {
    if (!holdNumber) return
    getHoldForUpdate(holdNumber)
  }, [holdNumber])

  const pageConfig = {
    pageHeading: `Edit Hold ${holdNumber}`,
    saveButtonText: 'Save Changes',
    submittingText: 'Saving…',
    cancelNavUrl: `/holds/${holdNumber}`,
  }

  const breadcrumbs = [
    { label: 'Holds', href: '/holds' },
    { label: holdNumber!, href: `/holds/${holdNumber}` },
    { label: 'Edit' },
  ]

  async function onValidHoldUpdateSubmit(holdForm: HoldForm) {
    try {
      await submitUpdateHold(holdNumber!, holdForm)
      navigate(`/holds/${holdNumber}`, {
        state: { successMessage: `Hold ${holdNumber} updated!` }
      })
    } catch {
      // interceptor already showed the error toast
    }
  }

  if (!holdFormData) return <div>Loading…</div>
  return <HoldFormPage
    defaultValues={holdFormData}
    pageConfig={pageConfig}
    breadcrumbs={breadcrumbs}
    onValidSubmit={onValidHoldUpdateSubmit}
  />
}
