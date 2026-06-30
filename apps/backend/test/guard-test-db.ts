const TEST_DB_PATTERN = /\/loon_test(\?|$)/
const url = process.env.DATABASE_URL ?? ''

if (!TEST_DB_PATTERN.test(url)) {
  throw new Error(
    `Refusing to run tests: DATABASE_URL must target loon_test, got "${url || '(unset)'}". ` +
      `Ensure apps/backend/.env.test exists.`,
  )
}
