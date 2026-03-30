const NAVIGATION_SECTIONS = [
  'arrivals', 'departures', 'transfers', 'invoices', 'holds', 'search', 'home'
] as const

export type NavigationSection = typeof NAVIGATION_SECTIONS[number]

export function isCollection(navigationSection: NavigationSection) {
  return navigationSection !== 'search' && navigationSection !== 'home'
}

export function isNavigationSection(value: string) {
  return NAVIGATION_SECTIONS.includes(value as NavigationSection)
}
