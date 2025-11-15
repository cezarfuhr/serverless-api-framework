import { APIGatewayProxyHandler } from 'aws-lambda';
import { dynamoDBService } from '../../services/dynamodb.service';
import { success, badRequest, notFound, internalServerError } from '../../utils/response';

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const userId = event.pathParameters?.id;

    if (!userId) {
      return badRequest('User ID is required');
    }

    const item = await dynamoDBService.get(`USER#${userId}`, `USER#${userId}`);

    if (!item) {
      return notFound('User not found');
    }

    // Remove DynamoDB keys from response
    const { pk, sk, gsi1pk, gsi1sk, ...user } = item;

    return success(user);
  } catch (error) {
    console.error('Error getting user:', error);
    return internalServerError('Failed to get user');
  }
};
