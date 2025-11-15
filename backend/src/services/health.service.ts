import { DynamoDBClient, DescribeTableCommand } from '@aws-sdk/client-dynamodb';
import { SESClient, GetAccountSendingEnabledCommand } from '@aws-sdk/client-ses';
import { log } from '../utils/logger';

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const sesClient = new SESClient({ region: process.env.AWS_REGION });

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    [key: string]: {
      status: 'up' | 'down' | 'degraded';
      latency?: number;
      message?: string;
      details?: any;
    };
  };
  metadata: {
    timestamp: string;
    uptime: number;
    version: string;
    environment: string;
    service: string;
  };
}

export class HealthService {
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  /**
   * Perform comprehensive health check
   */
  async checkHealth(detailed: boolean = false): Promise<HealthCheckResult> {
    const checks: HealthCheckResult['checks'] = {};

    // Always check basic health
    checks.api = {
      status: 'up',
      message: 'API is running',
    };

    // Perform detailed checks if requested
    if (detailed) {
      // Check DynamoDB
      checks.dynamodb = await this.checkDynamoDB();

      // Check SES
      checks.ses = await this.checkSES();

      // Check memory
      checks.memory = this.checkMemory();
    }

    // Determine overall status
    const overallStatus = this.determineOverallStatus(checks);

    return {
      status: overallStatus,
      checks,
      metadata: {
        timestamp: new Date().toISOString(),
        uptime: Date.now() - this.startTime,
        version: process.env.APP_VERSION || '1.0.0',
        environment: process.env.STAGE || 'development',
        service: 'serverless-api-framework',
      },
    };
  }

  /**
   * Check DynamoDB connectivity
   */
  private async checkDynamoDB(): Promise<HealthCheckResult['checks'][string]> {
    const startTime = Date.now();
    try {
      const tableName = process.env.DYNAMODB_TABLE;

      if (!tableName) {
        return {
          status: 'down',
          message: 'DynamoDB table name not configured',
        };
      }

      const command = new DescribeTableCommand({ TableName: tableName });
      const response = await dynamoClient.send(command);

      const latency = Date.now() - startTime;

      return {
        status: 'up',
        latency,
        message: 'DynamoDB is accessible',
        details: {
          tableName,
          tableStatus: response.Table?.TableStatus,
          itemCount: response.Table?.ItemCount,
        },
      };
    } catch (error: any) {
      log.error('DynamoDB health check failed', error);
      return {
        status: 'down',
        latency: Date.now() - startTime,
        message: error.message || 'DynamoDB health check failed',
      };
    }
  }

  /**
   * Check SES status
   */
  private async checkSES(): Promise<HealthCheckResult['checks'][string]> {
    const startTime = Date.now();
    try {
      const command = new GetAccountSendingEnabledCommand({});
      const response = await sesClient.send(command);

      const latency = Date.now() - startTime;

      return {
        status: response.Enabled ? 'up' : 'degraded',
        latency,
        message: response.Enabled ? 'SES is enabled' : 'SES sending is disabled',
        details: {
          enabled: response.Enabled,
        },
      };
    } catch (error: any) {
      log.error('SES health check failed', error);
      return {
        status: 'down',
        latency: Date.now() - startTime,
        message: error.message || 'SES health check failed',
      };
    }
  }

  /**
   * Check memory usage
   */
  private checkMemory(): HealthCheckResult['checks'][string] {
    const used = process.memoryUsage();
    const total = parseInt(process.env.AWS_LAMBDA_FUNCTION_MEMORY_SIZE || '256');
    const usedMB = Math.round(used.heapUsed / 1024 / 1024);
    const usagePercent = (usedMB / total) * 100;

    return {
      status: usagePercent > 90 ? 'degraded' : 'up',
      message: `Memory usage: ${usedMB}MB / ${total}MB (${usagePercent.toFixed(1)}%)`,
      details: {
        heapUsed: `${Math.round(used.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(used.heapTotal / 1024 / 1024)}MB`,
        external: `${Math.round(used.external / 1024 / 1024)}MB`,
        rss: `${Math.round(used.rss / 1024 / 1024)}MB`,
      },
    };
  }

  /**
   * Determine overall health status based on individual checks
   */
  private determineOverallStatus(
    checks: HealthCheckResult['checks']
  ): 'healthy' | 'degraded' | 'unhealthy' {
    const statuses = Object.values(checks).map((check) => check.status);

    if (statuses.some((status) => status === 'down')) {
      return 'unhealthy';
    }

    if (statuses.some((status) => status === 'degraded')) {
      return 'degraded';
    }

    return 'healthy';
  }

  /**
   * Quick liveness check (for load balancers)
   */
  isAlive(): boolean {
    return true;
  }

  /**
   * Readiness check (checks if service is ready to accept requests)
   */
  async isReady(): Promise<boolean> {
    try {
      // Check critical dependencies
      const dynamoCheck = await this.checkDynamoDB();
      return dynamoCheck.status !== 'down';
    } catch {
      return false;
    }
  }
}

export const healthService = new HealthService();
