import "dotenv/config";
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client.js'

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    idleTimeoutMillis: 30000,
    max: 5,
})

const adapter = new PrismaPg(pool)

const prisma = new PrismaClient({
    adapter,
    log: [
        {
            emit: 'event',
            level: 'query',
        },
        {
            emit: 'stdout',
            level: 'error',
        },
        {
            emit: 'stdout',
            level: 'info',
        },
        {
            emit: 'stdout',
            level: 'warn',
        },
    ],
})

prisma.$on('query', (e) => {
    console.log('Query: ' + e.query)
    console.log('Params: ' + e.params)
    console.log('Duration: ' + e.duration + 'ms')
})

export { prisma }