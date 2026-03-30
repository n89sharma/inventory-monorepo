import { getArrivalForEdit, updateArrival } from '@/data/api/arrival-api'
import { useConstantsStore } from '@/data/store/constants-store'
import { useModelStore } from '@/data/store/model-store'
import { useOrgStore } from '@/data/store/org-store'
import type { ArrivalForm } from '@/ui-types/arrival-form-types'
import { getSelectOption } from '@/ui-types/select-option-types'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrivalFormPage } from './arrival-form-page'

export function ArrivalEditPage(): React.JSX.Element {
  const { collectionId } = useParams<{ collectionId: string }>()
  const [resolved, setResolved] = useState<ArrivalForm | null>(null)
  const navigate = useNavigate()

  const orgs = useOrgStore(state => state.organizations)
  const warehouses = useConstantsStore(state => state.warehouses)
  const technicalStatuses = useConstantsStore(state => state.technicalStatuses)
  const coreFunctions = useConstantsStore(state => state.coreFunctions)
  const models = useModelStore(state => state.models)

  useEffect(() => {
    if (!collectionId) return
    if (!orgs.length || !warehouses.length || !models.length || !technicalStatuses.length || !coreFunctions.length) return

    async function load() {
      const raw = await getArrivalForEdit(collectionId!)
      setResolved({
        id: raw.id,
        vendor: orgs.find(o => o.id === raw.vendorId) ?? null,
        transporter: orgs.find(o => o.id === raw.transporterId) ?? null,
        warehouse: getSelectOption(warehouses.find(w => w.id === raw.warehouseId)!),
        comment: raw.comment,
        assets: raw.assets.map(a => ({
          id: a.id,
          model: models.find(m => m.id === a.modelId) ?? null,
          serialNumber: a.serialNumber,
          meterBlack: a.meterBlack,
          meterColour: a.meterColour,
          cassettes: a.cassettes,
          technicalStatus: getSelectOption(
            technicalStatuses.find(t => t.id === a.technicalStatusId)!
          ),
          internalFinisher: a.internalFinisher,
          coreFunctions: coreFunctions.filter(c => a.coreFunctionIds.includes(c.id))
        }))
      })
    }
    load()
  }, [collectionId, orgs.length, warehouses.length, models.length, technicalStatuses.length, coreFunctions.length])

  const pageConfig = {
    pageHeading: `Edit Arrival ${collectionId}`,
    saveButtonText: 'Save Changes',
    submittingText: 'Saving...',
    cancelNavUrl: `/arrivals/${collectionId}`,
  }

  const breadcrumbs = [
    { label: 'Arrivals', href: '/arrivals' },
    { label: collectionId!, href: `/arrivals/${collectionId}` },
    { label: 'Edit' },
  ]

  async function onValidSubmit(data: ArrivalForm) {
    try {
      const res = await updateArrival(collectionId!, data)
      if (res.success) {
        navigate(`/arrivals/${collectionId}`, {
          state: { successMessage: `Arrival ${collectionId} updated!` }
        })
      }
    } catch {
      toast.error('Something went wrong on the server.', { position: 'top-center' })
    }
  }

  if (!resolved) return <div>Loading…</div>
  return <ArrivalFormPage defaultValues={resolved} pageConfig={pageConfig} breadcrumbs={breadcrumbs} onValidSubmit={onValidSubmit} />
}
