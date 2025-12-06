-- Add soft delete columns to customers table
-- This replaces the hardcoded [DELETED] string approach with proper boolean flag

-- Add is_deleted boolean column (default false)
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE NOT NULL;

-- Add deleted_at timestamp column (nullable)
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_customers_is_deleted ON public.customers(is_deleted);
CREATE INDEX IF NOT EXISTS idx_customers_deleted_at ON public.customers(deleted_at);

-- Update existing records that were marked as deleted using the old method
-- This migrates existing [DELETED] records to use the new flag
UPDATE public.customers 
SET 
  is_deleted = TRUE,
  deleted_at = COALESCE(updated_at, created_at, NOW())
WHERE 
  full_name LIKE '[DELETED%' 
  OR age_group = '[DELETED]'
  OR email LIKE '[DELETED%'
  OR phone LIKE '[DELETED%';

-- Add comment for documentation
COMMENT ON COLUMN public.customers.is_deleted IS 'Soft delete flag - marks customer as deleted without physical removal';
COMMENT ON COLUMN public.customers.deleted_at IS 'Timestamp when customer was soft deleted';

