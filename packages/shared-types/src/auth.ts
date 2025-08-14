import { z } from 'zod';
import { BaseEntitySchema, UserRoleSchema } from './common';

// User schema
export const UserSchema = BaseEntitySchema.extend({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: UserRoleSchema,
  avatar: z.string().url().optional(),
  isEmailVerified: z.boolean().default(false),
  lastLoginAt: z.string().datetime().optional(),
});
export type User = z.infer<typeof UserSchema>;

// Auth schemas
export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const RegisterRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

export const AuthResponseSchema = z.object({
  user: UserSchema,
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number(),
});
export type AuthResponse = z.infer<typeof AuthResponseSchema>;

export const RefreshTokenRequestSchema = z.object({
  refreshToken: z.string(),
});
export type RefreshTokenRequest = z.infer<typeof RefreshTokenRequestSchema>;

export const ChangePasswordRequestSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(8),
});
export type ChangePasswordRequest = z.infer<typeof ChangePasswordRequestSchema>;

export const ForgotPasswordRequestSchema = z.object({
  email: z.string().email(),
});
export type ForgotPasswordRequest = z.infer<typeof ForgotPasswordRequestSchema>;

export const ResetPasswordRequestSchema = z.object({
  token: z.string(),
  newPassword: z.string().min(8),
});
export type ResetPasswordRequest = z.infer<typeof ResetPasswordRequestSchema>;