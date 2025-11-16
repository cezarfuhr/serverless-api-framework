import { APIGatewayProxyHandler } from 'aws-lambda';
import { UpdateUserInput } from '../../types';
import { dynamoDBService } from '../../services/dynamodb.service';
import { cognitoService } from '../../services/cognito.service';
import { success, badRequest, notFound, internalServerError } from '../../utils/response';

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const userId = event.pathParameters?.id;

    if (!userId) {
      return badRequest('User ID is required');
    }

    if (!event.body) {
      return badRequest('Request body is required');
    }

    const input: UpdateUserInput = JSON.parse(event.body);

    // Check if user exists
    const existingUser = await dynamoDBService.get(`USER#${userId}`, `USER#${userId}`);

    if (!existingUser) {
      return notFound('User not found');
    }

    const updates: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };

    if (input.name) {
      updates.name = input.name;

      // Update name in Cognito
      try {
        await cognitoService.updateUserAttributes(existingUser.email, {
          name: input.name,
        });
      } catch (error) {
        console.error('Failed to update Cognito user:', error);
      }
    }

    const updatedItem = await dynamoDBService.update(`USER#${userId}`, `USER#${userId}`, updates);

    // Remove DynamoDB keys from response
    const { pk, sk, gsi1pk, gsi1sk, ...user } = updatedItem;

    return success(user);
  } catch (error) {
    console.error('Error updating user:', error);
    return internalServerError('Failed to update user');
  }
};
