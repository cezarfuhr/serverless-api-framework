export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserInput {
  email: string;
  name: string;
  password: string;
}

export interface UpdateUserInput {
  name?: string;
}

export interface EmailInput {
  to: string[];
  subject: string;
  body: string;
  html?: string;
}

export interface ApiResponse<T = any> {
  statusCode: number;
  body: string;
  headers: {
    'Content-Type': string;
    'Access-Control-Allow-Origin': string;
    'Access-Control-Allow-Credentials': boolean;
  };
}

export interface DynamoDBItem {
  pk: string;
  sk: string;
  gsi1pk?: string;
  gsi1sk?: string;
  [key: string]: any;
}
