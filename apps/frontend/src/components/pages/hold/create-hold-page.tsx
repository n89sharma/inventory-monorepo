import { useHoldStore } from '@/data/store/hold-store'
import type { HoldForm } from '@/ui-types/hold-form-types'
import { UNSELECTED } from '@/ui-types/select-option-types'
import { useLocation, useNavigate } from 'react-router-dom'
import type { AssetSummary } from 'shared-types'
import { HoldFormPage } from './hold-form-page'

export function CreateHoldPage(): React.JSX.Element {
  const navigate = useNavigate()
  const { state } = useLocation()
  const { preloadedAssets, returnTo } =
    (state ?? {}) as { preloadedAssets?: AssetSummary[]; returnTo?: string }

  const submitCreateHold = useHoldStore(s => s.submitCreateHold)

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

  const defaultValues: HoldForm | undefined = preloadedAssets?.length
    ? { created_for: UNSELECTED, customer: null, notes: '', assets: preloadedAssets }
    : undefined

  async function onValidHoldCreateSubmit(data: HoldForm) {
    try {
      const { holdNumber } = await submitCreateHold(data)
      const destination = returnTo ?? `/holds/${holdNumber}`
      navigate(destination, { state: { successMessage: `Hold ${holdNumber} created!` } })
    } catch {
      // interceptor already showed the error toast
    }
  }

  return (
    <HoldFormPage
      pageConfig={pageConfig}
      breadcrumbs={breadcrumbs}
      onValidSubmit={onValidHoldCreateSubmit}
      defaultValues={defaultValues}
    />
  )
}
