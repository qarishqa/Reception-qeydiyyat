/**
 * Supabase Helper Functions
 * Utility functions for common Supabase operations
 */

import { supabase } from '@/integrations/supabase/client';
import { PostgrestFilterBuilder } from '@supabase/postgrest-js';

/**
 * Checks if is_deleted column exists in customers table
 * Caches the result to avoid repeated checks
 */
// Column artıq DB-də var - cache-i true olaraq başladırıq
let isDeletedColumnExists: boolean | null = true;

export async function checkIsDeletedColumnExists(): Promise<boolean> {
  if (isDeletedColumnExists !== null) {
    return isDeletedColumnExists;
  }

  try {
    const { data, error } = await supabase
      .from('customers')
      .select('is_deleted')
      .limit(1);
    
    // If error, check if it's a column not found error
    if (error) {
      // Check error code or message for column not found
      const errorMessage = (error.message || '').toLowerCase();
      const errorCode = error.code || '';
      const errorDetails = error.details || '';
      
      // Common PostgreSQL/PostgREST errors for missing column:
      // - 42703: undefined_column
      // - PGRST116: column not found
      // - 400: Bad Request (often means column doesn't exist)
      if (errorCode === '42703' || 
          errorCode === 'PGRST116' ||
          errorCode === '42P01' ||
          errorMessage.includes('column') && (errorMessage.includes('does not exist') || errorMessage.includes('not found')) ||
          errorMessage.includes('undefined_column') ||
          errorDetails.includes('is_deleted') ||
          (errorCode === '400' && errorMessage.includes('column'))) {
        isDeletedColumnExists = false;
        return false;
      }
      
      // For other errors, assume column doesn't exist to be safe
      // This prevents infinite retries
      console.warn('Error checking is_deleted column, assuming it does not exist:', error);
      isDeletedColumnExists = false;
      return false;
    }
    
    // No error and data returned means column exists
    isDeletedColumnExists = true;
    return true;
  } catch (err) {
    // Any exception means column likely doesn't exist
    console.warn('Exception checking is_deleted column, assuming it does not exist:', err);
    isDeletedColumnExists = false;
    return false;
  }
}

/**
 * Applies soft delete filter to a query
 * Automatically detects if is_deleted column exists and uses appropriate filter
 */
export async function applySoftDeleteFilter<T>(
  query: PostgrestFilterBuilder<any, T, any>
): Promise<PostgrestFilterBuilder<any, T, any>> {
  const hasIsDeletedColumn = await checkIsDeletedColumnExists();
  
  if (hasIsDeletedColumn) {
    return query.eq('is_deleted', false);
  } else {
    // Fallback to old method if column doesn't exist
    return query
      .not('full_name', 'like', '[DELETED%')
      .not('age_group', 'eq', '[DELETED]');
  }
}

/**
 * Resets the column existence cache
 * Useful after migrations
 */
export function resetColumnCache() {
  isDeletedColumnExists = null;
}

/**
 * Force check if column exists (bypasses cache)
 * Useful for debugging
 */
export async function forceCheckIsDeletedColumn(): Promise<boolean> {
  const previousCache = isDeletedColumnExists;
  isDeletedColumnExists = null;
  const result = await checkIsDeletedColumnExists();
  return result;
}

