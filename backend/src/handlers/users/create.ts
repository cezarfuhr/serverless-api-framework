import { APIGatewayProxyHandler } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { CreateUserInput, User } from '../../types';
import { dynamoDBService } from '../../services/dynamodb.service';
import { cognitoService } from '../../services/cognito.service';
import { sesService } from '../../services/ses.service';
import { created, badRequest, internalServerError } from '../../utils/response';

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    if (!event.body) {
      return badRequest('Request body is required');
    }

    const input: CreateUserInput = JSON.parse(event.body);

    // Validate input
    if (!input.email || !input.name || !input.password) {
      return badRequest('Email, name, and password are required');
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(input.email)) {
      return badRequest('Invalid email format');
    }

    // Password validation
    if (input.password.length < 8) {
      return badRequest('Password must be at least 8 characters long');
    }

    const userId = uuidv4();
    const timestamp = new Date().toISOString();

    // Create user in Cognito
    try {
      await cognitoService.signUp(input.email, input.password, input.name);
    } catch (error: any) {
      if (error.name === 'UsernameExistsException') {
        return badRequest('User with this email already exists');
      }
      throw error;
    }

    // Create user in DynamoDB
    const user: User = {
      id: userId,
      email: input.email,
      name: input.name,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await dynamoDBService.put({
      pk: `USER#${userId}`,
      sk: `USER#${userId}`,
      gsi1pk: `USER#EMAIL#${input.email}`,
      gsi1sk: `USER#EMAIL#${input.email}`,
      ...user,
    });

    // Send welcome email (non-blocking)
    sesService.sendWelcomeEmail(input.email, input.name).catch((error) => {
      console.error('Failed to send welcome email:', error);
    });

    return created(user);
  } catch (error) {
    console.error('Error creating user:', error);
    return internalServerError('Failed to create user');
  }
};
