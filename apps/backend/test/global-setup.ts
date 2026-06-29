import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { config } from 'dotenv'

const TEST_ENV_PATH = '.env.test'
const TEST_DB_PATTERN = /\/loon_test(\?|$)/

export default function setup() {
  const databaseUrl = config({ path: TEST_ENV_PATH }).parsed?.DATABASE_URL ?? ''

  if (!TEST_DB_PATTERN.test(databaseUrl)) {
    throw new Error(
      `Refusing to migrate: ${TEST_ENV_PATH} DATABASE_URL must target loon_test, got "${databaseUrl || '(unset)'}".`,
    )
  }

  const prismaBin = createRequire(import.meta.url).resolve('prisma/build/index.js')
  execFileSync(process.execPath, [prismaBin, 'migrate', 'deploy'], {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: databaseUrl },
  })
}
