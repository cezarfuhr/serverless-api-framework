import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { TooManyRequestsError } from '../utils/errors';
import { log } from '../utils/logger';

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

const RATE_LIMIT_TABLE = process.env.RATE_LIMIT_TABLE || 'rate-limits';

export interface RateLimitConfig {
  points: number; // Number of requests
  duration: number; // Time window in seconds
  keyPrefix?: string; // Prefix for the rate limit key
  blockDuration?: number; // How long to block after limit exceeded (seconds)
}

export class RateLimiter {
  constructor(private config: RateLimitConfig) {
    this.config.keyPrefix = config.keyPrefix || 'rl';
    this.config.blockDuration = config.blockDuration || config.duration;
  }

  /**
   * Get identifier from event (IP address or user ID)
   */
  private getIdentifier(event: APIGatewayProxyEvent): string {
    // Try to get user ID from authorizer
    const userId = event.requestContext?.authorizer?.claims?.sub;
    if (userId) {
      return `user:${userId}`;
    }

    // Fall back to IP address
    const ip = event.requestContext?.identity?.sourceIp || 'unknown';
    return `ip:${ip}`;
  }

  /**
   * Generate rate limit key
   */
  private getKey(identifier: string, path?: string): string {
    const pathPart = path ? `:${path.replace(/\//g, ':')}` : '';
    return `${this.config.keyPrefix}:${identifier}${pathPart}`;
  }

  /**
   * Check if request is within rate limit
   */
  async checkLimit(event: APIGatewayProxyEvent, path?: string): Promise<boolean> {
    const identifier = this.getIdentifier(event);
    const key = this.getKey(identifier, path);
    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - this.config.duration;

    try {
      // Get current rate limit data
      const { Item } = await docClient.send(
        new GetCommand({
          TableName: RATE_LIMIT_TABLE,
          Key: { key },
        })
      );

      // If no record or expired, allow request
      if (!Item || Item.expiresAt < now) {
        await this.recordRequest(key, now);
        return true;
      }

      // Check if currently blocked
      if (Item.blocked && Item.blockedUntil > now) {
        log.warn('Rate limit exceeded - blocked', {
          identifier,
          path,
          blockedUntil: new Date(Item.blockedUntil * 1000).toISOString(),
        });
        throw new TooManyRequestsError(
          `Rate limit exceeded. Try again in ${Item.blockedUntil - now} seconds.`
        );
      }

      // Filter requests within current window
      const requestsInWindow = Item.requests?.filter((ts: number) => ts > windowStart) || [];

      // Check if limit exceeded
      if (requestsInWindow.length >= this.config.points) {
        // Block the identifier
        await this.blockIdentifier(key, now);

        log.warn('Rate limit exceeded', {
          identifier,
          path,
          requests: requestsInWindow.length,
          limit: this.config.points,
        });

        throw new TooManyRequestsError(
          `Rate limit exceeded. Maximum ${this.config.points} requests per ${this.config.duration} seconds.`
        );
      }

      // Record this request
      requestsInWindow.push(now);
      await this.updateRequests(key, requestsInWindow, now);

      return true;
    } catch (error) {
      if (error instanceof TooManyRequestsError) {
        throw error;
      }

      // Log error but don't block requests if rate limiting fails
      log.error('Rate limiting check failed', error);
      return true;
    }
  }

  /**
   * Record a request
   */
  private async recordRequest(key: string, now: number): Promise<void> {
    const expiresAt = now + this.config.duration + 3600; // Add 1 hour buffer

    await docClient.send(
      new PutCommand({
        TableName: RATE_LIMIT_TABLE,
        Item: {
          key,
          requests: [now],
          expiresAt,
          createdAt: now,
          updatedAt: now,
        },
      })
    );
  }

  /**
   * Update request timestamps
   */
  private async updateRequests(
    key: string,
    requests: number[],
    now: number
  ): Promise<void> {
    const expiresAt = now + this.config.duration + 3600;

    await docClient.send(
      new PutCommand({
        TableName: RATE_LIMIT_TABLE,
        Item: {
          key,
          requests,
          expiresAt,
          updatedAt: now,
          blocked: false,
        },
      })
    );
  }

  /**
   * Block an identifier
   */
  private async blockIdentifier(key: string, now: number): Promise<void> {
    const blockedUntil = now + (this.config.blockDuration || this.config.duration);
    const expiresAt = blockedUntil + 3600;

    await docClient.send(
      new PutCommand({
        TableName: RATE_LIMIT_TABLE,
        Item: {
          key,
          blocked: true,
          blockedUntil,
          expiresAt,
          updatedAt: now,
        },
      })
    );
  }

  /**
   * Middleware factory
   */
  middleware() {
    return async (event: APIGatewayProxyEvent) => {
      await this.checkLimit(event, event.path);
    };
  }
}

// Predefined rate limiters
export const defaultRateLimiter = new RateLimiter({
  points: 100, // 100 requests
  duration: 60, // per minute
});

export const strictRateLimiter = new RateLimiter({
  points: 10,
  duration: 60,
  blockDuration: 300, // Block for 5 minutes
});

export const authRateLimiter = new RateLimiter({
  points: 5, // Only 5 login attempts
  duration: 300, // per 5 minutes
  blockDuration: 900, // Block for 15 minutes
  keyPrefix: 'auth',
});
