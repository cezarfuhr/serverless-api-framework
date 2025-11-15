import { log } from './logger';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational: boolean = true,
    public details?: any
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string = 'Bad Request', details?: any) {
    super(400, message, true, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(401, message, true);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(403, message, true);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(404, message, true);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists') {
    super(409, message, true);
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed', details?: any) {
    super(422, message, true, details);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(429, message, true);
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = 'Internal server error') {
    super(500, message, false);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message: string = 'Service temporarily unavailable') {
    super(503, message, false);
  }
}

// Error handler wrapper for Lambda functions
export function errorHandler(error: Error | AppError): {
  statusCode: number;
  body: string;
  headers: Record<string, any>;
} {
  // Log the error
  if (error instanceof AppError) {
    if (error.isOperational) {
      log.warn('Operational error occurred', {
        error: {
          name: error.name,
          message: error.message,
          statusCode: error.statusCode,
          details: error.details,
        },
      });
    } else {
      log.error('Non-operational error occurred', error);
    }
  } else {
    log.error('Unexpected error occurred', error);
  }

  // Determine status code and message
  const statusCode = error instanceof AppError ? error.statusCode : 500;
  const message = error instanceof AppError
    ? error.message
    : 'An unexpected error occurred';

  const details = error instanceof AppError ? error.details : undefined;

  // Don't expose internal errors in production
  const isProduction = process.env.NODE_ENV === 'production';
  const shouldHideDetails = !isProduction || (error instanceof AppError && !error.isOperational);

  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
    body: JSON.stringify({
      success: false,
      error: {
        message: shouldHideDetails && statusCode === 500
          ? 'Internal server error'
          : message,
        ...(details && { details }),
        ...((!isProduction || shouldHideDetails) && error.stack && { stack: error.stack }),
      },
    }),
  };
}

// Async error wrapper for Lambda handlers
export function asyncHandler(handler: Function) {
  return async (event: any, context: any) => {
    try {
      return await handler(event, context);
    } catch (error) {
      return errorHandler(error as Error);
    }
  };
}

// Process error monitoring
export function setupErrorMonitoring() {
  process.on('unhandledRejection', (reason: any) => {
    log.error('Unhandled Promise Rejection', reason);
    throw reason;
  });

  process.on('uncaughtException', (error: Error) => {
    log.error('Uncaught Exception', error);
    process.exit(1);
  });
}
