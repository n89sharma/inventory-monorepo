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
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

export function formatDateWithTime(rawDate: Date): string {
  return format(rawDate, 'MMMM dd, yyyy, h:mm a')
}

export function formatDate(rawDate: Date): string {
  return format(rawDate, 'MMMM dd, yyyy')
}
