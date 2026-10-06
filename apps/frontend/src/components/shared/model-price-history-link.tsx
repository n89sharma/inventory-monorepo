import type { SalesWindowMonths } from '@/lib/filters/parsers'
import { modelPriceHistoryHref } from '@/lib/filters/serializers'
import { ArrowSquareOutIcon } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'

interface ModelPriceHistoryLinkProps {
  modelId: number
  modelName: string
  months: SalesWindowMonths
}

export function ModelPriceHistoryLink({
  modelId,
  modelName,
  months,
}: ModelPriceHistoryLinkProps): React.JSX.Element {
  return (
    <Link
      to={modelPriceHistoryHref(modelId, months)}
      aria-label={`Price history for ${modelName}`}
      className="inline-flex text-muted-foreground hover:text-foreground"
    >
      <ArrowSquareOutIcon className="size-4" />
    </Link>
  )
}
