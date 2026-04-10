import { useConstantsStore } from '@/data/store/constants-store'
import { useDepartureStore } from '@/data/store/departure-store'
import { useOrgStore } from '@/data/store/org-store'
import type { DepartureForm } from '@/ui-types/departure-form-types'
import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { DepartureFormPage } from './departure-form-page'

export function UpdateDeparturePage(): React.JSX.Element {
  const { collectionId: departureNumber } = useParams<{ collectionId: string }>()
  const navigate = useNavigate()

  const departureFormData = useDepartureStore(state => state.departureFormData)
  const getDepartureForUpdate = useDepartureStore(state => state.getDepartureForUpdate)
  const submitUpdateDeparture = useDepartureStore(state => state.submitUpdateDeparture)

  const orgs = useOrgStore(state => state.organizations)
  const warehouses = useConstantsStore(state => state.warehouses)

  useEffect(() => {
    if (!departureNumber) return
    if (!orgs.length || !warehouses.length) return
    getDepartureForUpdate(departureNumber)
  }, [departureNumber, orgs.length, warehouses.length])

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
      const res = await submitUpdateDeparture(departureNumber!, departureForm)
      if (res.success) {
        navigate(`/departures/${departureNumber}`, {
          state: { successMessage: `Departure ${departureNumber} updated!` }
        })
      }
    } catch {
      toast.error('Something went wrong on the server.', { position: 'top-center' })
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
