import winston from 'winston'

const isDev = process.env.NODE_ENV !== 'production'

const devFormat = winston.format.combine(
  winston.format.errors({ stack: true }),
  winston.format.colorize(),
  winston.format.printf(({ level, message, stack }) => {
    return stack ? `${level}: ${message}\n${stack}` : `${level}: ${message}`
  })
)

const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
)

export const logger = winston.createLogger({
  level: isDev ? 'debug' : 'info',
  defaultMeta: { service: 'loon-backend' },
  format: isDev ? devFormat : prodFormat,
  transports: [
    new winston.transports.Console({
      handleExceptions: true,
      handleRejections: true,
    })
  ]
})
