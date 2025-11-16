import { APIGatewayProxyHandler } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../../types';
import { dynamoDBService } from '../../services/dynamodb.service';
import { cognitoService } from '../../services/cognito.service';
import { sesService } from '../../services/ses.service';
import { created } from '../../utils/response';
import { withMiddleware } from '../../middleware';
import { log } from '../../utils/logger';
import { BadRequestError, ConflictError } from '../../utils/errors';
import { validate, ValidationError } from '../../validation/validator';
import { createUserSchema } from '../../validation/schemas';

const createUserHandler: APIGatewayProxyHandler = async (event) => {
  const startTime = Date.now();

  // Validate request body exists
  if (!event.body) {
    throw new BadRequestError('Request body is required');
  }

  // Parse and validate input with Zod
  let input;
  try {
    const parsedBody = JSON.parse(event.body);
    input = validate(createUserSchema, parsedBody);
  } catch (error) {
    if (error instanceof ValidationError) {
      throw new BadRequestError('Validation failed', error.errors);
    }
    throw new BadRequestError('Invalid JSON in request body');
  }

  log.info('Creating new user', { email: input.email });

  const userId = uuidv4();
  const timestamp = new Date().toISOString();

  // Create user in Cognito
  try {
    log.debug('Creating user in Cognito', { userId, email: input.email });
    await cognitoService.signUp(input.email, input.password, input.name);
    log.info('User created in Cognito', { userId, email: input.email });
  } catch (error: any) {
    if (error.name === 'UsernameExistsException') {
      log.warn('User already exists', { email: input.email });
      throw new ConflictError('User with this email already exists');
    }
    log.error('Failed to create user in Cognito', error, { userId, email: input.email });
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

  try {
    log.debug('Storing user in DynamoDB', { userId });
    await dynamoDBService.put({
      pk: `USER#${userId}`,
      sk: `USER#${userId}`,
      gsi1pk: `USER#EMAIL#${input.email}`,
      gsi1sk: `USER#EMAIL#${input.email}`,
      ...user,
    });
    log.info('User stored in DynamoDB', { userId });
  } catch (error) {
    log.error('Failed to store user in DynamoDB', error, { userId });
    throw error;
  }

  // Send welcome email (non-blocking)
  sesService
    .sendWelcomeEmail(input.email, input.name)
    .then(() => {
      log.info('Welcome email sent', { userId, email: input.email });
    })
    .catch((error) => {
      log.error('Failed to send welcome email', error, { userId, email: input.email });
    });

  // Log performance
  const duration = Date.now() - startTime;
  log.logPerformance('createUser', duration, { userId });

  // Log business event
  log.logEvent('user.created', {
    userId,
    email: input.email,
    name: input.name,
  });

  return created(user);
};

// Export handler with middleware
export const handler = withMiddleware(createUserHandler);
