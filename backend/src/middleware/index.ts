import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { log, loggerContext } from '../utils/logger';
import { errorHandler } from '../utils/errors';

export type LambdaHandler = (
  event: APIGatewayProxyEvent,
  context: Context
) => Promise<APIGatewayProxyResult>;

export interface MiddlewareContext {
  correlationId: string;
  startTime: number;
  event: APIGatewayProxyEvent;
  context: Context;
}

export type Middleware = (
  handler: LambdaHandler,
  middlewareContext: MiddlewareContext
) => LambdaHandler;

/**
 * Correlation ID middleware
 * Adds correlation ID to all logs for request tracing
 */
export const correlationIdMiddleware: Middleware = (handler, ctx) => {
  return async (event, context) => {
    // Get or generate correlation ID
    const correlationId =
      event.headers?.['x-correlation-id'] ||
      event.headers?.['X-Correlation-Id'] ||
      event.requestContext?.requestId ||
      uuidv4();

    // Set correlation ID in logger context
    loggerContext.setContext({
      correlationId,
      requestId: context.requestId,
      functionName: context.functionName,
      functionVersion: context.functionVersion,
    });

    ctx.correlationId = correlationId;

    const result = await handler(event, context);

    // Add correlation ID to response headers
    return {
      ...result,
      headers: {
        ...result.headers,
        'X-Correlation-Id': correlationId,
      },
    };
  };
};

/**
 * Request logging middleware
 * Logs incoming requests and responses
 */
export const requestLoggingMiddleware: Middleware = (handler, ctx) => {
  return async (event, context) => {
    const startTime = Date.now();
    ctx.startTime = startTime;

    // Log incoming request
    log.info('Incoming request', {
      httpMethod: event.httpMethod,
      path: event.path,
      queryParams: event.queryStringParameters,
      pathParams: event.pathParameters,
      sourceIp: event.requestContext?.identity?.sourceIp,
      userAgent: event.requestContext?.identity?.userAgent,
    });

    const result = await handler(event, context);

    // Log response
    const duration = Date.now() - startTime;
    log.info('Request completed', {
      statusCode: result.statusCode,
      duration: `${duration}ms`,
    });

    // Log performance warning if slow
    if (duration > 1000) {
      log.warn('Slow request detected', {
        duration: `${duration}ms`,
        path: event.path,
      });
    }

    return result;
  };
};

/**
 * Error handling middleware
 * Catches and handles errors uniformly
 */
export const errorHandlingMiddleware: Middleware = (handler) => {
  return async (event, context) => {
    try {
      return await handler(event, context);
    } catch (error) {
      return errorHandler(error as Error);
    } finally {
      // Clear logger context after request
      loggerContext.clearContext();
    }
  };
};

/**
 * Performance monitoring middleware
 * Tracks and logs performance metrics
 */
export const performanceMiddleware: Middleware = (handler, ctx) => {
  return async (event, context) => {
    const markers: Array<{ name: string; time: number }> = [];

    const mark = (name: string) => {
      markers.push({ name, time: Date.now() - ctx.startTime });
    };

    // Make mark function available in context
    (context as any).mark = mark;

    const result = await handler(event, context);

    // Log performance markers
    if (markers.length > 0) {
      log.debug('Performance markers', { markers });
    }

    return result;
  };
};

/**
 * CORS middleware
 * Adds CORS headers to responses
 */
export const corsMiddleware: Middleware = (handler) => {
  return async (event, context) => {
    const result = await handler(event, context);

    return {
      ...result,
      headers: {
        ...result.headers,
        'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
        'Access-Control-Allow-Credentials': true,
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Access-Control-Allow-Headers':
          'Content-Type,Authorization,X-Correlation-Id',
      },
    };
  };
};

/**
 * Compose multiple middlewares
 */
export function composeMiddleware(...middlewares: Middleware[]) {
  return (handler: LambdaHandler): LambdaHandler => {
    const ctx: MiddlewareContext = {
      correlationId: '',
      startTime: Date.now(),
    } as any;

    return middlewares.reduceRight(
      (acc, middleware) => middleware(acc, ctx),
      handler
    );
  };
}

/**
 * Default middleware stack
 */
export const defaultMiddleware = composeMiddleware(
  errorHandlingMiddleware,
  correlationIdMiddleware,
  requestLoggingMiddleware,
  performanceMiddleware,
  corsMiddleware
);

/**
 * Wrapper to apply default middleware to handler
 */
export function withMiddleware(handler: LambdaHandler): LambdaHandler {
  return defaultMiddleware(handler);
}
