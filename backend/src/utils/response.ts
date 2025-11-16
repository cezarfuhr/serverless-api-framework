import { ApiResponse } from '../types';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Credentials': true,
};

export const success = <T>(data: T, statusCode = 200): ApiResponse<T> => ({
  statusCode,
  headers,
  body: JSON.stringify({
    success: true,
    data,
  }),
});

export const error = (message: string, statusCode = 500): ApiResponse => ({
  statusCode,
  headers,
  body: JSON.stringify({
    success: false,
    error: message,
  }),
});

export const created = <T>(data: T): ApiResponse<T> => success(data, 201);

export const noContent = (): ApiResponse => ({
  statusCode: 204,
  headers,
  body: '',
});

export const badRequest = (message: string): ApiResponse => error(message, 400);

export const unauthorized = (message = 'Unauthorized'): ApiResponse => error(message, 401);

export const forbidden = (message = 'Forbidden'): ApiResponse => error(message, 403);

export const notFound = (message = 'Resource not found'): ApiResponse => error(message, 404);

export const internalServerError = (message = 'Internal server error'): ApiResponse =>
  error(message, 500);
