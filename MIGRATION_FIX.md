# Migration Fix - is_deleted Column

## Problem
`is_deleted` column-u DB-də yoxdur və bütün query-lər 400 error verir.

## Həll

### 1. Supabase Dashboard-da SQL Editor-a gedin

### 2. Bu SQL-i çalıştırın:

```sql
-- Add is_deleted and deleted_at columns to customers table for soft delete
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE NOT NULL;

ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customers_is_deleted ON public.customers(is_deleted);
CREATE INDEX IF NOT EXISTS idx_customers_deleted_at ON public.customers(deleted_at);

-- Create a function to set deleted_at timestamp
CREATE OR REPLACE FUNCTION public.set_deleted_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_deleted = TRUE AND OLD.is_deleted = FALSE THEN
    NEW.deleted_at = NOW();
  ELSIF NEW.is_deleted = FALSE AND OLD.is_deleted = TRUE THEN
    NEW.deleted_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to call the function before update
DROP TRIGGER IF EXISTS set_deleted_at_trigger ON public.customers;
CREATE TRIGGER set_deleted_at_trigger
BEFORE UPDATE ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.set_deleted_at();

-- Update RLS policies to exclude soft-deleted entries
-- Drop existing policies first if they conflict
DROP POLICY IF EXISTS "Users can view their own customers" ON public.customers;
DROP POLICY IF EXISTS "Admins can view all customers" ON public.customers;

-- Re-add policies with is_deleted = FALSE for SELECT operations
CREATE POLICY "Users can view their own customers" ON public.customers
  FOR SELECT TO authenticated USING (auth.uid() = created_by AND is_deleted = FALSE);

CREATE POLICY "Admins can view all customers" ON public.customers
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND p.role = 'admin'
    ) AND is_deleted = FALSE
  );

-- Ensure INSERT policy also sets is_deleted to FALSE by default
DROP POLICY IF EXISTS "Users can insert their own customers" ON public.customers;
CREATE POLICY "Users can insert their own customers" ON public.customers
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by AND is_deleted = FALSE);

-- Add UPDATE policy for soft delete
DROP POLICY IF EXISTS "Users can soft delete their own customers" ON public.customers;
CREATE POLICY "Users can soft delete their own customers" ON public.customers
  FOR UPDATE TO authenticated USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Admins can soft delete any customer" ON public.customers;
CREATE POLICY "Admins can soft delete any customer" ON public.customers
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND p.role = 'admin'
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND p.role = 'admin'
    )
  );
```

### 3. Browser-də cache-i reset edin

Browser console-da bu kodu çalıştırın:

```javascript
// Reset cache
localStorage.clear();
sessionStorage.clear();
location.reload();
```

Və ya sadəcə browser-i yeniləyin (F5).

## Nəticə

Migration apply edildikdən sonra:
- ✅ Bütün query-lər işləyəcək
- ✅ Soft delete mexanizmi aktiv olacaq
- ✅ Error-lar yox olacaq
- ✅ Performance yaxşılaşacaq

