import { describe, expect, it } from 'vitest'
import {
  formatDate,
  formatDateWithTime,
  formatFilenameDate,
  formatMonthYear,
  formatOrgName,
} from './formatters'

describe('formatDate', () => {
  it('abbreviates the month', () => {
    expect(formatDate(new Date(2026, 8, 17))).toBe('Sep 17, 2026')
  })

  it('does not pad single-digit days', () => {
    expect(formatDate(new Date(2026, 8, 7))).toBe('Sep 7, 2026')
  })

  it('returns an empty string for null', () => {
    expect(formatDate(null)).toBe('')
  })
})

describe('formatDateWithTime', () => {
  it('appends the time to the shared date format', () => {
    expect(formatDateWithTime(new Date(2026, 8, 17, 15, 4))).toBe('Sep 17, 2026, 3:04 PM')
  })
})

describe('formatMonthYear', () => {
  it('shows the abbreviated month and year', () => {
    expect(formatMonthYear(new Date(2026, 8, 17))).toBe('Sep 2026')
  })
})

describe('formatFilenameDate', () => {
  it('shows a compact sortable date', () => {
    expect(formatFilenameDate(new Date(2026, 8, 7))).toBe('20260907')
  })
})

describe('formatOrgName', () => {
  it('keeps a name of two words or fewer whole', () => {
    expect(formatOrgName('Acme')).toBe('Acme')
    expect(formatOrgName('Acme Trading')).toBe('Acme Trading')
  })

  it('keeps the first two words and marks the rest as dropped', () => {
    expect(formatOrgName('Acme Trading Company Ltd')).toBe('Acme Trading…')
  })

  it('ignores surrounding and repeated whitespace', () => {
    expect(formatOrgName('  Acme   Trading  ')).toBe('Acme Trading')
    expect(formatOrgName('Acme   Trading   Company')).toBe('Acme Trading…')
  })

  it('leaves a single long word alone, having no word boundary to cut on', () => {
    expect(formatOrgName('Bundesdruckereigesellschaft')).toBe('Bundesdruckereigesellschaft')
  })
})
