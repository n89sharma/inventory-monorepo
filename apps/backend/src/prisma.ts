import "dotenv/config";
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client.js'
import { logger } from './lib/logger.js'

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    idleTimeoutMillis: 30000,
    max: 5,
})

const adapter = new PrismaPg(pool)
const isDev = process.env.NODE_ENV !== 'production'
const SLOW_QUERY_THRESHOLD_MS = 200

const prisma = new PrismaClient({
    adapter,
    log: [
        { emit: 'event', level: 'query' },
        { emit: 'stdout', level: 'error' },
        { emit: 'stdout', level: 'warn' },
    ],
})

prisma.$on('query', (e) => {
    if (isDev) {
        logger.debug(`[prisma] query ${e.duration}ms`)
    } else if (e.duration > SLOW_QUERY_THRESHOLD_MS) {
        logger.warn(`Slow query ${e.duration}ms`)
    }
})

export { prisma }