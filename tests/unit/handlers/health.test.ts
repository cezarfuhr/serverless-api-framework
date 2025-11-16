import { handler } from '../../../backend/src/handlers/health';
import { APIGatewayProxyEvent, Context } from 'aws-lambda';

describe('Health Handler', () => {
  it('should return health status', async () => {
    const event = {} as APIGatewayProxyEvent;
    const context = {} as Context;

    const result = await handler(event, context, () => {});

    expect(result).toBeDefined();
    expect(result?.statusCode).toBe(200);

    const body = JSON.parse(result?.body || '{}');
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('healthy');
    expect(body.data.service).toBe('serverless-api-framework');
  });

  it('should include timestamp in response', async () => {
    const event = {} as APIGatewayProxyEvent;
    const context = {} as Context;

    const result = await handler(event, context, () => {});
    const body = JSON.parse(result?.body || '{}');

    expect(body.data.timestamp).toBeDefined();
    expect(new Date(body.data.timestamp).toString()).not.toBe('Invalid Date');
  });
});
