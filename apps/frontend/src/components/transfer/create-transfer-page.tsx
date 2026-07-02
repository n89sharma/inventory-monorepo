import { useProfileDefaultWarehouse } from '@/hooks/use-profile-default-warehouse'
import { useTransferMutations } from '@/hooks/use-transfer-mutations'
import { getSelectOption, UNSELECTED } from '@/ui-types/select-option-types'
import type { TransferForm } from '@/ui-types/transfer-form-types'
import { useLocation, useNavigate } from 'react-router-dom'
import type { AssetSummary } from 'shared-types'
import { TransferFormPage } from './transfer-form-page'

export function CreateTransferPage(): React.JSX.Element {
  const navigate = useNavigate()
  const { state } = useLocation()
  const { preloadedAssets, returnTo } = (state ?? {}) as {
    preloadedAssets?: AssetSummary[]
    returnTo?: string
  }

  const mutations = useTransferMutations()
  const defaultWarehouse = useProfileDefaultWarehouse()

  const pageConfig = {
    pageHeading: 'Create Transfer',
    saveButtonText: 'Save',
    submittingText: 'Saving…',
    cancelNavUrl: '/transfers',
  }

  const breadcrumbs = [{ label: 'Transfers', href: '/transfers' }, { label: 'Create' }]

  const defaultValues: TransferForm | undefined = preloadedAssets?.length
    ? {
        origin: defaultWarehouse ? getSelectOption(defaultWarehouse) : UNSELECTED,
        destination: UNSELECTED,
        transporter: null,
        comment: '',
        assets: preloadedAssets,
      }
    : undefined

  async function onValidTransferCreateSubmit(data: TransferForm) {
    try {
      const { transferNumber } = await mutations.create(data)
      const destination = returnTo ?? `/transfers/${transferNumber}`
      navigate(destination, { state: { successToast: { entity: 'transfer', id: transferNumber } } })
    } catch {
      // interceptor already showed the error toast
    }
  }

  return (
    <TransferFormPage
      pageConfig={pageConfig}
      breadcrumbs={breadcrumbs}
      onValidSubmit={onValidTransferCreateSubmit}
      defaultValues={defaultValues}
    />
  )
}
