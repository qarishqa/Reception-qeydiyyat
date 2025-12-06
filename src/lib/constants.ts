/**
 * Application-wide constants
 */

export const CONFIG = {
  // Email domain for user accounts
  EMAIL_DOMAIN: import.meta.env.VITE_EMAIL_DOMAIN || '@performance-center.az',
  
  // Pagination settings
  PAGINATION_SIZE: 20,
  DRILL_DOWN_LIMIT: 50,
  
  // Analytics settings
  MONTHLY_STATS_MONTHS: 6,
} as const;

/**
 * Customer status enum values
 */
export const CUSTOMER_STATUS = {
  NEW_INQUIRY: 'new_inquiry',
  TEST_DRIVE_SCHEDULED: 'test_drive_scheduled',
  NEGOTIATING: 'negotiating',
  SOLD: 'sold',
  LOST: 'lost',
} as const;

/**
 * User roles
 */
export const USER_ROLES = {
  ADMIN: 'admin',
  RECEPTION: 'reception',
} as const;

