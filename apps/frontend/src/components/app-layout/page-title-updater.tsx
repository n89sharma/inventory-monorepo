import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const APP_NAME = 'Loon'

const SECTION_LABEL: Record<string, string> = {
  arrivals: 'Arrivals',
  transfers: 'Transfers',
  departures: 'Departures',
  holds: 'Holds',
  invoices: 'Invoices',
  'put-away': 'Put Away',
  search: 'Search',
  settings: 'Settings',
  reports: 'Reports',
}

const ENTITY_LABEL: Record<string, string> = {
  arrivals: 'Arrival',
  transfers: 'Transfer',
  departures: 'Departure',
  holds: 'Hold',
  invoices: 'Invoice',
}

function deriveSearchTitle(id: string | undefined, sub: string | undefined): string {
  const view = id === 'instock' ? 'In Stock' : 'All'
  if (sub) return `Asset ${sub} | ${view} | Search Assets | ${APP_NAME}`
  return `${view} | Search Assets | ${APP_NAME}`
}

function deriveTitle(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean)

  if (segments.length === 0) return APP_NAME

  const [section, id, sub] = segments
  const sectionLabel = SECTION_LABEL[section]
  const entityLabel = ENTITY_LABEL[section]

  if (section === 'search') return deriveSearchTitle(id, sub)
  if (sub === 'edit') return sectionLabel ? `Edit ${id} | ${sectionLabel} | ${APP_NAME}` : APP_NAME
  if (sub) return `Asset ${sub} | ${id} | ${APP_NAME}`
  if (id === 'new') return entityLabel ? `New ${entityLabel} | ${APP_NAME}` : APP_NAME
  if (id) return sectionLabel ? `${id} | ${sectionLabel} | ${APP_NAME}` : `${id} | ${APP_NAME}`
  return sectionLabel ? `${sectionLabel} | ${APP_NAME}` : APP_NAME
}

export function PageTitleUpdater(): null {
  const { pathname } = useLocation()

  useEffect(() => {
    document.title = deriveTitle(pathname)
  }, [pathname])

  return null
}
