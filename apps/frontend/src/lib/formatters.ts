import { format } from 'date-fns'

export function formatThousandsK(value: number | null): string {
  if (value === null) return ''
  if (value < 1000) return value.toString()
  return (value / 1000).toFixed(0) + " K"
}

export function formatUSD(value: number | null): string {
  if (value === null) return ''
  const currencyValue = new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
  return currencyValue
}

export function formatSentenceCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

export function formatDateWithTime(rawDate: Date): string {
  return format(rawDate, 'MMMM dd, yyyy, h:mm a')
}

export function formatDate(rawDate: Date): string {
  return format(rawDate, 'MMMM dd, yyyy')
}

export function formatHistoryTimestamp(changedOn: Date | string): string {
  const now = new Date()
  const date = new Date(changedOn)
  const diffMinutes = Math.floor((now.getTime() - date.getTime()) / 60000)

  if (diffMinutes < 2) {
    return `a moment ago`
  }
  if (diffMinutes < 60) {
    return `${diffMinutes} ${diffMinutes === 1 ? 'min ago' : 'mins ago'}`
  }
  if (diffMinutes < 1440) {
    const hours = Math.round(diffMinutes / 60)
    return `${hours} ${hours === 1 ? 'hr ago' : 'hrs ago'}`
  }
  if (diffMinutes < 2880) {
    return 'yesterday'
  }
  return format(date, 'd MMM, yyyy')
}
