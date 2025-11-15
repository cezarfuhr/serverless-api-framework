import { z } from 'zod';

// User schemas
export const createUserSchema = z.object({
  email: z
    .string()
    .email('Invalid email format')
    .min(5, 'Email must be at least 5 characters')
    .max(255, 'Email must not exceed 255 characters'),
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters')
    .regex(/^[a-zA-Z\s]+$/, 'Name must contain only letters and spaces'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must not exceed 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
});

export const updateUserSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters')
    .regex(/^[a-zA-Z\s]+$/, 'Name must contain only letters and spaces')
    .optional(),
});

export const userIdSchema = z.object({
  id: z.string().uuid('Invalid user ID format'),
});

// Email schemas
export const sendEmailSchema = z.object({
  to: z
    .array(z.string().email('Invalid email format'))
    .min(1, 'At least one recipient is required')
    .max(50, 'Maximum 50 recipients allowed'),
  subject: z
    .string()
    .min(1, 'Subject is required')
    .max(200, 'Subject must not exceed 200 characters'),
  body: z
    .string()
    .min(1, 'Email body is required')
    .max(10000, 'Email body must not exceed 10000 characters'),
  html: z
    .string()
    .max(50000, 'HTML body must not exceed 50000 characters')
    .optional(),
});

// Query parameter schemas
export const paginationSchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 50))
    .refine((val) => val > 0 && val <= 100, 'Limit must be between 1 and 100'),
  offset: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 0))
    .refine((val) => val >= 0, 'Offset must be non-negative'),
});

// Type exports
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type SendEmailInput = z.infer<typeof sendEmailSchema>;
export type PaginationParams = z.infer<typeof paginationSchema>;
