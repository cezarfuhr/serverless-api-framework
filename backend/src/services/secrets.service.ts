import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';
import { log } from '../utils/logger';

const client = new SecretsManagerClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

// Cache for secrets to avoid repeated API calls
const secretsCache = new Map<string, { value: any; expiresAt: number }>();
const CACHE_TTL = 300000; // 5 minutes in milliseconds

export class SecretsService {
  /**
   * Get a secret from AWS Secrets Manager with caching
   */
  async getSecret(secretName: string, useCache: boolean = true): Promise<any> {
    // Check cache first
    if (useCache) {
      const cached = secretsCache.get(secretName);
      if (cached && cached.expiresAt > Date.now()) {
        log.debug('Secret retrieved from cache', { secretName });
        return cached.value;
      }
    }

    try {
      log.debug('Fetching secret from Secrets Manager', { secretName });

      const command = new GetSecretValueCommand({
        SecretId: secretName,
      });

      const response = await client.send(command);

      let secretValue: any;
      if (response.SecretString) {
        try {
          secretValue = JSON.parse(response.SecretString);
        } catch {
          secretValue = response.SecretString;
        }
      } else if (response.SecretBinary) {
        secretValue = Buffer.from(response.SecretBinary).toString('utf-8');
      }

      // Cache the secret
      if (useCache) {
        secretsCache.set(secretName, {
          value: secretValue,
          expiresAt: Date.now() + CACHE_TTL,
        });
      }

      log.info('Secret retrieved successfully', { secretName });
      return secretValue;
    } catch (error: any) {
      log.error('Failed to retrieve secret', error, { secretName });
      throw error;
    }
  }

  /**
   * Get a specific key from a JSON secret
   */
  async getSecretKey(secretName: string, key: string): Promise<string> {
    const secret = await this.getSecret(secretName);

    if (typeof secret === 'object' && key in secret) {
      return secret[key];
    }

    throw new Error(`Key '${key}' not found in secret '${secretName}'`);
  }

  /**
   * Clear the secrets cache
   */
  clearCache(secretName?: string) {
    if (secretName) {
      secretsCache.delete(secretName);
      log.debug('Secret cache cleared', { secretName });
    } else {
      secretsCache.clear();
      log.debug('All secrets cache cleared');
    }
  }

  /**
   * Helper to get database credentials
   */
  async getDatabaseCredentials(): Promise<{
    username: string;
    password: string;
    host: string;
    port: number;
    database: string;
  }> {
    const secretName = process.env.DB_SECRET_NAME || 'prod/database/credentials';
    return await this.getSecret(secretName);
  }

  /**
   * Helper to get API keys
   */
  async getApiKey(serviceName: string): Promise<string> {
    const secretName = `${process.env.STAGE || 'dev'}/api-keys/${serviceName}`;
    return await this.getSecret(secretName);
  }

  /**
   * Helper to get encryption keys
   */
  async getEncryptionKey(): Promise<string> {
    const secretName = process.env.ENCRYPTION_KEY_SECRET || 'prod/encryption/key';
    return await this.getSecret(secretName);
  }
}

export const secretsService = new SecretsService();

/**
 * Helper function to safely get environment variable or secret
 */
export async function getConfig(
  key: string,
  defaultValue?: string,
  fromSecret?: string
): Promise<string> {
  // First, try environment variable
  if (process.env[key]) {
    return process.env[key]!;
  }

  // If secret name provided, try to get from Secrets Manager
  if (fromSecret) {
    try {
      return await secretsService.getSecretKey(fromSecret, key);
    } catch (error) {
      log.warn(`Failed to get ${key} from secret ${fromSecret}`, { error });
    }
  }

  // Return default value or throw error
  if (defaultValue !== undefined) {
    return defaultValue;
  }

  throw new Error(`Configuration key '${key}' not found`);
}
