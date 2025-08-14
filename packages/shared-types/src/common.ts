import { z } from 'zod';

// Common status enum
export const StatusSchema = z.enum(['active', 'inactive', 'pending', 'completed', 'failed']);
export type Status = z.infer<typeof StatusSchema>;

// Common pagination
export const PaginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
export type Pagination = z.infer<typeof PaginationSchema>;

export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    pagination: z.object({
      page: z.number(),
      limit: z.number(),
      total: z.number(),
      totalPages: z.number(),
      hasNext: z.boolean(),
      hasPrev: z.boolean(),
    }),
  });

// API Response wrapper
export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.string().optional(),
    message: z.string().optional(),
    timestamp: z.string().datetime(),
  });

// Base entity
export const BaseEntitySchema = z.object({
  id: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type BaseEntity = z.infer<typeof BaseEntitySchema>;

// User role enum
export const UserRoleSchema = z.enum(['admin', 'manager', 'user']);
export type UserRole = z.infer<typeof UserRoleSchema>;

// File upload
export const FileUploadSchema = z.object({
  filename: z.string(),
  originalName: z.string(),
  mimetype: z.string(),
  size: z.number(),
  url: z.string().url(),
});
export type FileUpload = z.infer<typeof FileUploadSchema>;