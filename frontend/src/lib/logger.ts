import winston from 'winston'

// Define log levels with colors
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
}

const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'cyan',
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...metadata } = info
    const metaString = Object.keys(metadata).length ? JSON.stringify(metadata, null, 2) : ''
    return `[${timestamp}] ${level}: ${message} ${metaString}`
  })
)

// Configure winston logger
winston.addColors(logColors)

const logger = winston.createLogger({
  levels: logLevels,
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: logFormat,
  transports: [
    new winston.transports.Console({
      format: logFormat,
    }),
    // Add file transport for production
    ...(process.env.NODE_ENV === 'production' ? [
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        ),
      }),
      new winston.transports.File({
        filename: 'logs/combined.log',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        ),
      }),
    ] : []),
  ],
})

// Create specialized loggers for different components
export const payoutLogger = logger.child({ component: 'PAYOUT-WORKER' })
export const blockchainLogger = logger.child({ component: 'BLOCKCHAIN' })
export const apiLogger = logger.child({ component: 'API' })
export const authLogger = logger.child({ component: 'AUTH' })

export default logger