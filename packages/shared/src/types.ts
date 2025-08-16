import { z } from 'zod';

// Base schemas
export const ListingSchema = z.object({
  LIST_NO: z.string(),
  ADDRESS: z.string(),
  TOWN: z.string(),
  STATE: z.string(),
  ZIP: z.string(),
  PRICE: z.number().positive(),
  BEDS: z.number().int().min(0),
  BATHS: z.number().positive(),
  SQFT: z.number().positive().optional(),
  LOT_SIZE: z.number().positive().optional(),
  YEAR_BUILT: z.number().int().min(1800).optional(),
  PROPERTY_TYPE: z.string(),
  STATUS: z.string(),
  LIST_DATE: z.string(),
  LAST_MODIFIED: z.string(),
  PHOTOS: z.array(z.string()).optional(),
  DESCRIPTION: z.string().optional(),
  AGENT_NAME: z.string().optional(),
  AGENT_PHONE: z.string().optional(),
  AGENT_EMAIL: z.string().optional(),
  MLS_ID: z.string().optional(),
  SOURCE: z.string().optional(),
});

export const RentDataSchema = z.object({
  zip: z.string(),
  rents: z.record(z.string(), z.number().positive()),
  marketTier: z.string(),
  county: z.string(),
  town: z.string(),
});

export const AnalysisResultSchema = z.object({
  listing: ListingSchema,
  rentAnalysis: z.object({
    averageRent: z.number().positive(),
    rentToPriceRatio: z.number().positive(),
    monthlyCashFlow: z.number(),
    annualCashFlow: z.number(),
    capRate: z.number().positive(),
    grossRentMultiplier: z.number().positive(),
  }),
  marketAnalysis: z.object({
    marketTier: z.string(),
    county: z.string(),
    town: z.string(),
    zipCode: z.string(),
  }),
  timestamp: z.string(),
});

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  role: z.enum(['user', 'admin', 'analyst']),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const AuthTokenSchema = z.object({
  token: z.string(),
  expiresAt: z.string(),
  userId: z.string().uuid(),
});

// API Response schemas
export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.string().optional(),
    message: z.string().optional(),
    timestamp: z.string(),
  });

export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: z.array(dataSchema),
    pagination: z.object({
      page: z.number().int().positive(),
      limit: z.number().int().positive(),
      total: z.number().int().nonnegative(),
      totalPages: z.number().int().positive(),
    }),
    timestamp: z.string(),
  });

// Export types
export type Listing = z.infer<typeof ListingSchema>;
export type RentData = z.infer<typeof RentDataSchema>;
export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;
export type User = z.infer<typeof UserSchema>;
export type AuthToken = z.infer<typeof AuthTokenSchema>;
export type ApiResponse<T> = z.infer<ReturnType<typeof ApiResponseSchema<z.ZodType<T>>>>;
export type PaginatedResponse<T> = z.infer<ReturnType<typeof PaginatedResponseSchema<z.ZodType<T>>>>;

// API Error types
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, public field?: string) {
    super(400, message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
    this.field = field;
  }
}

export class NotFoundError extends ApiError {
  constructor(resource: string) {
    super(404, `${resource} not found`, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = 'Unauthorized') {
    super(401, message, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = 'Forbidden') {
    super(403, message, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}
