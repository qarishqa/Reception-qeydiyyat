/**
 * Centralized Error Handler
 * Provides consistent error handling across the application
 */

import { toast } from 'sonner';

/**
 * Error types that can occur in the application
 */
export enum ErrorType {
  NETWORK = 'NETWORK',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',
  NOT_FOUND = 'NOT_FOUND',
  DATABASE = 'DATABASE',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Error context for better error tracking
 */
export interface ErrorContext {
  action?: string; // e.g., 'fetchCustomers', 'createUser'
  component?: string; // e.g., 'CustomerList', 'Dashboard'
  userId?: string;
  metadata?: Record<string, any>;
}

/**
 * Application error class
 */
export class AppError extends Error {
  constructor(
    message: string,
    public type: ErrorType,
    public context?: ErrorContext,
    public originalError?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Maps Supabase error codes to user-friendly messages
 */
const SUPABASE_ERROR_MESSAGES: Record<string, string> = {
  'PGRST116': 'Məlumat tapılmadı',
  '23505': 'Bu məlumat artıq mövcuddur',
  '23503': 'Əlaqəli məlumat olduğu üçün silinə bilməz',
  '42501': 'Bu əməliyyatı yerinə yetirmək üçün icazəniz yoxdur',
  '42P01': 'Cədvəl tapılmadı',
  '42703': 'Sütun tapılmadı',
};

/**
 * Maps common error patterns to user-friendly messages
 */
const ERROR_PATTERN_MESSAGES: Array<{ pattern: RegExp; message: string }> = [
  {
    pattern: /email_not_confirmed|Email not confirmed/i,
    message: 'E-poçt təsdiqlənməyib. Administratorla əlaqə saxlayın.',
  },
  {
    pattern: /Invalid login credentials|invalid_credentials/i,
    message: 'İstifadəçi adı və ya şifrə yanlışdır',
  },
  {
    pattern: /network|fetch|connection/i,
    message: 'İnternet bağlantısını yoxlayın və yenidən cəhd edin',
  },
  {
    pattern: /timeout/i,
    message: 'Sorğu vaxtı bitdi. Yenidən cəhd edin',
  },
  {
    pattern: /permission|unauthorized|forbidden/i,
    message: 'Bu əməliyyatı yerinə yetirmək üçün icazəniz yoxdur',
  },
  {
    pattern: /not found|404/i,
    message: 'Axtardığınız məlumat tapılmadı',
  },
];

/**
 * Determines error type from error object
 */
function getErrorType(error: any): ErrorType {
  if (error?.code === 'PGRST116' || error?.message?.includes('not found')) {
    return ErrorType.NOT_FOUND;
  }
  if (error?.message?.includes('permission') || error?.message?.includes('unauthorized')) {
    return ErrorType.AUTHORIZATION;
  }
  if (error?.message?.includes('Invalid login') || error?.message?.includes('email_not_confirmed')) {
    return ErrorType.AUTHENTICATION;
  }
  if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
    return ErrorType.NETWORK;
  }
  if (error?.code?.startsWith('PGRST') || error?.code?.startsWith('42')) {
    return ErrorType.DATABASE;
  }
  return ErrorType.UNKNOWN;
}

/**
 * Gets user-friendly error message
 */
function getUserFriendlyMessage(error: any): string {
  // Check Supabase error codes
  if (error?.code && SUPABASE_ERROR_MESSAGES[error.code]) {
    return SUPABASE_ERROR_MESSAGES[error.code];
  }

  // Check error patterns
  const errorMessage = error?.message || error?.toString() || '';
  for (const { pattern, message } of ERROR_PATTERN_MESSAGES) {
    if (pattern.test(errorMessage)) {
      return message;
    }
  }

  // Check if error already has a user-friendly message
  if (error?.message && !error.message.includes('Error') && !error.message.includes('error')) {
    return error.message;
  }

  // Default messages based on error type
  const errorType = getErrorType(error);
  switch (errorType) {
    case ErrorType.NETWORK:
      return 'İnternet bağlantısını yoxlayın və yenidən cəhd edin';
    case ErrorType.AUTHENTICATION:
      return 'Giriş xətası baş verdi. Yenidən cəhd edin';
    case ErrorType.AUTHORIZATION:
      return 'Bu əməliyyatı yerinə yetirmək üçün icazəniz yoxdur';
    case ErrorType.NOT_FOUND:
      return 'Axtardığınız məlumat tapılmadı';
    case ErrorType.DATABASE:
      return 'Verilənlər bazası xətası baş verdi. Yenidən cəhd edin';
    default:
      return 'Gözlənilməz xəta baş verdi. Yenidən cəhd edin';
  }
}

/**
 * Logs error to console (and potentially to error tracking service)
 */
function logError(error: any, context?: ErrorContext) {
  const errorInfo = {
    message: error?.message || error?.toString(),
    type: getErrorType(error),
    context,
    stack: error?.stack,
    originalError: error,
    timestamp: new Date().toISOString(),
  };

  // Log to console in development
  if (import.meta.env.DEV) {
    console.error('🚨 Error:', errorInfo);
  }

  // TODO: Send to error tracking service (e.g., Sentry) in production
  // if (import.meta.env.PROD) {
  //   errorTrackingService.captureException(error, { extra: context });
  // }
}

/**
 * Main error handler function
 * 
 * @param error - The error object
 * @param context - Context about where/why the error occurred
 * @param showToast - Whether to show a toast notification (default: true)
 * @returns User-friendly error message
 */
export function handleError(
  error: any,
  context?: ErrorContext,
  showToast: boolean = true
): string {
  const userMessage = getUserFriendlyMessage(error);
  const errorType = getErrorType(error);

  // Log error
  logError(error, context);

  // Show toast notification
  if (showToast) {
    toast.error(userMessage, {
      description: context?.action ? `Əməliyyat: ${context.action}` : undefined,
      duration: 5000,
    });
  }

  return userMessage;
}

/**
 * Handles Supabase-specific errors
 */
export function handleSupabaseError(
  error: any,
  context?: ErrorContext,
  showToast: boolean = true
): string {
  return handleError(error, context, showToast);
}

/**
 * Creates an AppError instance
 */
export function createError(
  message: string,
  type: ErrorType = ErrorType.UNKNOWN,
  context?: ErrorContext,
  originalError?: any
): AppError {
  return new AppError(message, type, context, originalError);
}

/**
 * Wraps async functions with error handling
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context?: ErrorContext
): T {
  return (async (...args: any[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      handleError(error, context);
      throw error; // Re-throw to allow caller to handle if needed
    }
  }) as T;
}

