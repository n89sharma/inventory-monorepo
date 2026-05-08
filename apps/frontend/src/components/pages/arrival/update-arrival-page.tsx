import { useArrivalStore } from '@/data/store/arrival-store'
import type { ArrivalForm } from '@/ui-types/arrival-form-types'
import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrivalFormPage } from './arrival-form-page'

export function UpdateArrivalPage(): React.JSX.Element {
  const { collectionId: arrivalNumber } = useParams<{ collectionId: string }>()
  const navigate = useNavigate()

  const arrivalFormData = useArrivalStore(state => state.arrivalFormData)
  const getArrivalForUpdate = useArrivalStore(state => state.getArrivalForUpdate)
  const submitUpdateArrival = useArrivalStore(state => state.submitUpdateArrival)

  useEffect(() => {
    if (!arrivalNumber) return
    getArrivalForUpdate(arrivalNumber)
  }, [arrivalNumber])

  const pageConfig = {
    pageHeading: `Edit Arrival ${arrivalNumber}`,
    saveButtonText: 'Save Changes',
    submittingText: 'Saving…',
    cancelNavUrl: `/arrivals/${arrivalNumber}`,
  }

  const breadcrumbs = [
    { label: 'Arrivals', href: '/arrivals' },
    { label: arrivalNumber!, href: `/arrivals/${arrivalNumber}` },
    { label: 'Edit' },
  ]

  async function onValidArrivalUpdateSubmit(arrivalForm: ArrivalForm) {
    try {
      await submitUpdateArrival(arrivalNumber!, arrivalForm)
      navigate(`/arrivals/${arrivalNumber}`, {
        state: { successMessage: `Arrival ${arrivalNumber} updated!` }
      })
    } catch {
      // interceptor already showed the error toast
    }
  }

  if (!arrivalFormData) return <div>Loading…</div>
  return <ArrivalFormPage
    defaultValues={arrivalFormData}
    pageConfig={pageConfig}
    breadcrumbs={breadcrumbs}
    onValidSubmit={onValidArrivalUpdateSubmit}
  />
}
