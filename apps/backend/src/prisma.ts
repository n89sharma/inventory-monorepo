import "dotenv/config";
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client.js'
import { logger } from './lib/logger.js'
import { requestContext } from './lib/context.js'

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    idleTimeoutMillis: 30000,
    max: 40,
})

const adapter = new PrismaPg(pool)
const isDev = process.env.NODE_ENV !== 'production'
const SLOW_QUERY_THRESHOLD_MS = 200

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