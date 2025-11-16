import { APIGatewayProxyHandler } from 'aws-lambda';
import { dynamoDBService } from '../../services/dynamodb.service';
import { noContent, badRequest, notFound, internalServerError } from '../../utils/response';

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const userId = event.pathParameters?.id;

    if (!userId) {
      return badRequest('User ID is required');
    }

    // Check if user exists
    const existingUser = await dynamoDBService.get(`USER#${userId}`, `USER#${userId}`);

    if (!existingUser) {
      return notFound('User not found');
    }

    await dynamoDBService.delete(`USER#${userId}`, `USER#${userId}`);

    return noContent();
  } catch (error) {
    console.error('Error deleting user:', error);
    return internalServerError('Failed to delete user');
  }
};
