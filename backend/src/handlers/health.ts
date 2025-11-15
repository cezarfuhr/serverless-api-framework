import { APIGatewayProxyHandler } from 'aws-lambda';
import { success } from '../utils/response';
import { healthService } from '../services/health.service';
import { withMiddleware } from '../middleware';

const healthHandler: APIGatewayProxyHandler = async (event) => {
  // Check if detailed health check is requested
  const detailed = event.queryStringParameters?.detailed === 'true';

  const healthStatus = await healthService.checkHealth(detailed);

  // Return appropriate status code based on health
  const statusCode = healthStatus.status === 'healthy' ? 200
    : healthStatus.status === 'degraded' ? 200
    : 503;

  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
    body: JSON.stringify({
      success: healthStatus.status !== 'unhealthy',
      data: healthStatus,
    }),
  };
};

// Liveness endpoint (simple check)
export const livenessHandler: APIGatewayProxyHandler = async () => {
  return success({
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
};

// Readiness endpoint (checks dependencies)
export const readinessHandler: APIGatewayProxyHandler = async () => {
  const isReady = await healthService.isReady();

  return {
    statusCode: isReady ? 200 : 503,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
    body: JSON.stringify({
      success: isReady,
      data: {
        status: isReady ? 'ready' : 'not ready',
        timestamp: new Date().toISOString(),
      },
    }),
  };
};

export const handler = withMiddleware(healthHandler);
