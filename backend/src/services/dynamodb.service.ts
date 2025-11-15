import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { DynamoDBItem } from '../types';

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});

const tableName = process.env.DYNAMODB_TABLE!;

export class DynamoDBService {
  async get(pk: string, sk: string): Promise<DynamoDBItem | null> {
    const command = new GetCommand({
      TableName: tableName,
      Key: { pk, sk },
    });

    const result = await docClient.send(command);
    return result.Item as DynamoDBItem | null;
  }

  async put(item: DynamoDBItem): Promise<DynamoDBItem> {
    const command = new PutCommand({
      TableName: tableName,
      Item: item,
    });

    await docClient.send(command);
    return item;
  }

  async update(
    pk: string,
    sk: string,
    updates: Record<string, any>
  ): Promise<DynamoDBItem> {
    const updateExpression = Object.keys(updates)
      .map((key, index) => `#attr${index} = :val${index}`)
      .join(', ');

    const expressionAttributeNames = Object.keys(updates).reduce(
      (acc, key, index) => ({
        ...acc,
        [`#attr${index}`]: key,
      }),
      {}
    );

    const expressionAttributeValues = Object.values(updates).reduce(
      (acc, value, index) => ({
        ...acc,
        [`:val${index}`]: value,
      }),
      {}
    );

    const command = new UpdateCommand({
      TableName: tableName,
      Key: { pk, sk },
      UpdateExpression: `SET ${updateExpression}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    });

    const result = await docClient.send(command);
    return result.Attributes as DynamoDBItem;
  }

  async delete(pk: string, sk: string): Promise<void> {
    const command = new DeleteCommand({
      TableName: tableName,
      Key: { pk, sk },
    });

    await docClient.send(command);
  }

  async query(
    keyConditionExpression: string,
    expressionAttributeValues: Record<string, any>,
    indexName?: string
  ): Promise<DynamoDBItem[]> {
    const command = new QueryCommand({
      TableName: tableName,
      IndexName: indexName,
      KeyConditionExpression: keyConditionExpression,
      ExpressionAttributeValues: expressionAttributeValues,
    });

    const result = await docClient.send(command);
    return (result.Items as DynamoDBItem[]) || [];
  }

  async scan(limit?: number): Promise<DynamoDBItem[]> {
    const command = new ScanCommand({
      TableName: tableName,
      Limit: limit,
    });

    const result = await docClient.send(command);
    return (result.Items as DynamoDBItem[]) || [];
  }
}

export const dynamoDBService = new DynamoDBService();
