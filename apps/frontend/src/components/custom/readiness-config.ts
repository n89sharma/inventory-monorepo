import { CheckCircleIcon, QuestionIcon, WarningOctagonIcon } from '@phosphor-icons/react'

type IconConfig = {
  Icon: React.ElementType
  className: string
  weight: 'regular' | 'fill'
  display: string
}

type ReadinessCode = 'UNTESTED' | 'HAS_ERRORS' | 'PP_OK' | 'CUSTOMER_READY'

const READINESS_CONFIG = {
  UNTESTED: {
    Icon: QuestionIcon,
    className: 'text-slate-400',
    weight: 'regular',
    display: 'Untested',
  },
  HAS_ERRORS: {
    Icon: WarningOctagonIcon,
    className: 'text-red-500',
    weight: 'regular',
    display: 'Has errors',
  },
  PP_OK: {
    Icon: CheckCircleIcon,
    className: 'text-green-600',
    weight: 'regular',
    display: 'PP OK',
  },
  CUSTOMER_READY: {
    Icon: CheckCircleIcon,
    className: 'text-green-600',
    weight: 'fill',
    display: 'Customer ready',
  },
} as const satisfies Record<ReadinessCode, IconConfig>

const UNKNOWN_READINESS_CONFIG: IconConfig = {
  Icon: QuestionIcon,
  className: 'text-slate-400',
  weight: 'regular',
  display: 'Unknown',
}

function isReadinessCode(status: string): status is ReadinessCode {
  return status in READINESS_CONFIG
}

export function getReadinessIconConfig(status: string): IconConfig {
  return isReadinessCode(status) ? READINESS_CONFIG[status] : UNKNOWN_READINESS_CONFIG
}

export function getReadinessDisplay(status: string): string {
  return getReadinessIconConfig(status).display
}
