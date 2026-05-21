import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/shadcn/tooltip'
import { formatSentenceCase } from '@/lib/formatters'
import {
  CheckCircleIcon,
  QuestionIcon,
  WarningOctagonIcon,
} from '@phosphor-icons/react'

type IconConfig = {
  Icon: React.ElementType
  className: string
  weight?: 'regular' | 'fill'
}

function getIconConfig(status: string): IconConfig {
  switch (status) {
    case 'UNTESTED':
      return { Icon: QuestionIcon, className: 'text-slate-400' }
    case 'HAS_ERRORS':
      return { Icon: WarningOctagonIcon, className: 'text-red-500' }
    case 'PP_OK':
      return { Icon: CheckCircleIcon, className: 'text-green-600' }
    case 'CUSTOMER_READY':
      return { Icon: CheckCircleIcon, className: 'text-green-600', weight: 'fill' }
    default:
      return { Icon: QuestionIcon, className: 'text-slate-400' }
  }
}

export function ReadinessIcon({ status }: { status: string }) {
  const { Icon, className, weight = 'regular' } = getIconConfig(status)
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">
          <Icon size={18} weight={weight} className={className} />
        </span>
      </TooltipTrigger>
      <TooltipContent>{formatSentenceCase(status)}</TooltipContent>
    </Tooltip>
  )
}
