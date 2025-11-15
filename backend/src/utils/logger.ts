import winston from 'winston';

const logLevel = process.env.LOG_LEVEL || 'info';
const isProduction = process.env.NODE_ENV === 'production';

// Custom format for structured logging
const structuredFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.metadata(),
  winston.format.json()
);

// Development format for better readability
const developmentFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: logLevel,
  format: isProduction ? structuredFormat : developmentFormat,
  defaultMeta: {
    service: 'serverless-api-framework',
    environment: process.env.STAGE || 'development',
  },
  transports: [
    new winston.transports.Console({
      handleExceptions: true,
      handleRejections: true,
    }),
  ],
});

// Context storage for request-scoped data
class LoggerContext {
  private context: Record<string, any> = {};

  setContext(data: Record<string, any>) {
    this.context = { ...this.context, ...data };
  }

  getContext() {
    return this.context;
  }

  clearContext() {
    this.context = {};
  }

  log(level: string, message: string, meta?: Record<string, any>) {
    logger.log(level, message, { ...this.context, ...meta });
  }
}

export const loggerContext = new LoggerContext();

// Helper methods
export const log = {
  debug: (message: string, meta?: Record<string, any>) => {
    loggerContext.log('debug', message, meta);
  },

  info: (message: string, meta?: Record<string, any>) => {
    loggerContext.log('info', message, meta);
  },

  warn: (message: string, meta?: Record<string, any>) => {
    loggerContext.log('warn', message, meta);
  },

  error: (message: string, error?: Error | any, meta?: Record<string, any>) => {
    const errorMeta = error instanceof Error
      ? {
          error: {
            message: error.message,
            stack: error.stack,
            name: error.name,
          },
          ...meta,
        }
      : { error, ...meta };

    loggerContext.log('error', message, errorMeta);
  },

  // Request logging
  logRequest: (event: any) => {
    log.info('Incoming request', {
      httpMethod: event.httpMethod,
      path: event.path,
      queryParams: event.queryStringParameters,
      sourceIp: event.requestContext?.identity?.sourceIp,
      userAgent: event.requestContext?.identity?.userAgent,
    });
  },

  logResponse: (statusCode: number, duration: number) => {
    log.info('Request completed', {
      statusCode,
      duration: `${duration}ms`,
    });
  },

  // Performance logging
  logPerformance: (operation: string, duration: number, meta?: Record<string, any>) => {
    const level = duration > 1000 ? 'warn' : 'info';
    loggerContext.log(level, `Performance: ${operation}`, {
      operation,
      duration: `${duration}ms`,
      ...meta,
    });
  },

  // Business events logging
  logEvent: (eventName: string, meta?: Record<string, any>) => {
    log.info(`Event: ${eventName}`, {
      event: eventName,
      ...meta,
    });
  },
};

export default logger;
