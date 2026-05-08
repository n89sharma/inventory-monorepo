import { useDepartureStore } from '@/data/store/departure-store'
import type { DepartureForm } from '@/ui-types/departure-form-types'
import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { DepartureFormPage } from './departure-form-page'

export function UpdateDeparturePage(): React.JSX.Element {
  const { collectionId: departureNumber } = useParams<{ collectionId: string }>()
  const navigate = useNavigate()

  const departureFormData = useDepartureStore(state => state.departureFormData)
  const getDepartureForUpdate = useDepartureStore(state => state.getDepartureForUpdate)
  const submitUpdateDeparture = useDepartureStore(state => state.submitUpdateDeparture)

  useEffect(() => {
    if (!departureNumber) return
    getDepartureForUpdate(departureNumber)
  }, [departureNumber])

  const pageConfig = {
    pageHeading: `Edit Departure ${departureNumber}`,
    saveButtonText: 'Save Changes',
    submittingText: 'Saving…',
    cancelNavUrl: `/departures/${departureNumber}`,
  }

  const breadcrumbs = [
    { label: 'Departures', href: '/departures' },
    { label: departureNumber!, href: `/departures/${departureNumber}` },
    { label: 'Edit' },
  ]

  async function onValidDepartureUpdateSubmit(departureForm: DepartureForm) {
    try {
      await submitUpdateDeparture(departureNumber!, departureForm)
      navigate(`/departures/${departureNumber}`, {
        state: { successMessage: `Departure ${departureNumber} updated!` }
      })
    } catch {
      // interceptor already showed the error toast
    }
  }

  if (!departureFormData) return <div>Loading…</div>
  return <DepartureFormPage
    defaultValues={departureFormData}
    pageConfig={pageConfig}
    breadcrumbs={breadcrumbs}
    onValidSubmit={onValidDepartureUpdateSubmit}
  />
}
