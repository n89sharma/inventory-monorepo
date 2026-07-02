import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/shadcn/tooltip'
import { getReadinessIconConfig } from './readiness-config'

export function ReadinessIcon({ status }: { status: string }) {
  const { Icon, className, weight, display } = getReadinessIconConfig(status)
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex align-middle">
          <Icon size={18} weight={weight} className={className} />
        </span>
      </TooltipTrigger>
      <TooltipContent>{display}</TooltipContent>
    </Tooltip>
  )
}
