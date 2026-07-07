// Derives the deployment environment from the configured backend API URL and
// maps it to a header background tint, so it's obvious at a glance which
// environment the app is talking to. Prod is intentionally untinted.
const ENV_HEADER_BG = {
  dev: 'bg-orange-100',
  staging: 'bg-amber-100',
  prod: '',
} as const satisfies Record<string, string>

const LOCAL_HOSTNAMES = ['localhost', '127.0.0.1']
const STAGING_HOST_PREFIX = 'staging.api.'

function getApiHostname(apiUrl: string | undefined): string | null {
  if (!apiUrl) return null
  try {
    return new URL(apiUrl).hostname
  } catch {
    return null
  }
}

export function getEnvHeaderBg(
  apiUrl: string | undefined = import.meta.env.VITE_INVENTORY_API_URL,
): string {
  const hostname = getApiHostname(apiUrl)
  if (hostname && LOCAL_HOSTNAMES.includes(hostname)) return ENV_HEADER_BG.dev
  if (hostname && hostname.startsWith(STAGING_HOST_PREFIX)) return ENV_HEADER_BG.staging
  return ENV_HEADER_BG.prod
}
