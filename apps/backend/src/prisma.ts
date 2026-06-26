import 'dotenv/config'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client.js'
import { logger } from './lib/logger.js'
import { requestContext } from './lib/context.js'

const POOL_IDLE_TIMEOUT_MS = 30000
const DB_POOL_MAX = Number(process.env.DB_POOL_MAX) || 40
const SLOW_QUERY_THRESHOLD_MS = Number(process.env.SLOW_QUERY_THRESHOLD_MS) || 200

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  idleTimeoutMillis: POOL_IDLE_TIMEOUT_MS,
  max: DB_POOL_MAX,
})

const adapter = new PrismaPg(pool)
const isDev = process.env.NODE_ENV !== 'production'

const prisma = new PrismaClient({
  adapter,
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' },
  ],
})

prisma.$on('query', (e) => {
  const { requestId } = requestContext.getStore() ?? {}
  if (isDev) {
    logger.debug(`[prisma] query ${e.duration}ms`, { requestId })
  } else if (e.duration > SLOW_QUERY_THRESHOLD_MS) {
    logger.warn(`[prisma] slow query ${e.duration}ms`, { requestId })
  }
})

prisma.$on('error', (e) => {
  const { requestId } = requestContext.getStore() ?? {}
  logger.error(`[prisma] ${e.message}`, { target: e.target, requestId })
})

prisma.$on('warn', (e) => {
  const { requestId } = requestContext.getStore() ?? {}
  logger.warn(`[prisma] ${e.message}`, { target: e.target, requestId })
})

export { prisma }
