import { APIGatewayProxyHandler } from 'aws-lambda';
import { dynamoDBService } from '../../services/dynamodb.service';
import { success, internalServerError } from '../../utils/response';

export const handler: APIGatewayProxyHandler = async () => {
  try {
    const items = await dynamoDBService.scan();

    // Filter only user items and remove DynamoDB keys
    const users = items
      .filter((item) => item.pk.startsWith('USER#'))
      .map(({ pk, sk, gsi1pk, gsi1sk, ...user }) => user);

    return success({
      users,
      count: users.length,
    });
  } catch (error) {
    console.error('Error listing users:', error);
    return internalServerError('Failed to list users');
  }
};
