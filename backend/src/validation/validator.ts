import { z, ZodError } from 'zod';
import { badRequest } from '../utils/response';

export class ValidationError extends Error {
  constructor(
    public errors: Array<{ field: string; message: string }>
  ) {
    super('Validation failed');
    this.name = 'ValidationError';
  }
}

export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof ZodError) {
      const validationErrors = error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      throw new ValidationError(validationErrors);
    }
    throw error;
  }
}

export function formatValidationError(error: ValidationError) {
  return badRequest(
    JSON.stringify({
      message: 'Validation failed',
      errors: error.errors,
    })
  );
}

export async function validateAsync<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): Promise<T> {
  try {
    return await schema.parseAsync(data);
  } catch (error) {
    if (error instanceof ZodError) {
      const validationErrors = error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      throw new ValidationError(validationErrors);
    }
    throw error;
  }
}
