import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/shadcn/tooltip'
import { formatSentenceCase } from '@/lib/formatters'
import { CheckCircleIcon, QuestionIcon, WarningIcon, WrenchIcon } from '@phosphor-icons/react'

type IconConfig = { Icon: React.ElementType; className: string }

function getIconConfig(status: string): IconConfig {
  switch (status) {
    case 'OK':       return { Icon: CheckCircleIcon, className: 'text-green-600' }
    case 'ERROR':    return { Icon: WarningIcon,     className: 'text-red-500' }
    case 'PREPARED': return { Icon: WrenchIcon,      className: 'text-blue-500' }
    default:         return { Icon: QuestionIcon,    className: 'text-slate-400' }
  }
}

export function TechnicalStatusIcon({ status }: { status: string }) {
  const { Icon, className } = getIconConfig(status)
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">
          <Icon size={18} className={className} />
        </span>
      </TooltipTrigger>
      <TooltipContent>{formatSentenceCase(status)}</TooltipContent>
    </Tooltip>
  )
}
