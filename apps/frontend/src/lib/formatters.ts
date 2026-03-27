import { format } from 'date-fns'

export function formatThousandsK(value: number | string): string {
  const numValue = typeof value != 'number' ? parseInt(value) : value
  if (numValue < 1000) return value.toString()
  return (numValue / 1000).toFixed(0) + " K"
}

export function formatUSD(value: number) {
  const currencyValue = new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
  return currencyValue
}

export function formatSentenceCase(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

export function getFormattedDate(rawDate: string, withTime?: boolean) {
  if (withTime) {
    return format(new Date(rawDate), 'MMMM dd, yyyy, h:mm a')
  }
  return format(new Date(rawDate), 'MMMM dd, yyyy')
}

export function getInitials(name: string): string {
  const words = name.trim().split(/\s+/)

  if (words.length === 1) {
    // Single word: take first 2 characters
    return words[0].slice(0, 2).toUpperCase()
  }

  // Multiple words: take first letter of first 2 words
  return words
    .slice(0, 2)
    .map(word => word[0])
    .join('')
    .toUpperCase()
}

export function getPartNames(notes: string): string {
  const sqrBracketRegex = /\[(.*?)\]/g
  const goodBadRegex = /Exchanged(.*?)\(GOOD\)/g

  const sqrBracketResults = Array.from(notes.matchAll(sqrBracketRegex)).map(m => m[1])
  const goodBadResults = Array.from(notes.matchAll(goodBadRegex)).map(m => m[1])

  if (sqrBracketResults[0]) return sqrBracketResults[0]
  return goodBadResults[0]
}