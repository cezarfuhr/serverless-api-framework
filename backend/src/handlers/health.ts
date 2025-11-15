import { APIGatewayProxyHandler } from 'aws-lambda';
import { success } from '../utils/response';

export const handler: APIGatewayProxyHandler = async () => {
  return success({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'serverless-api-framework',
  });
};
