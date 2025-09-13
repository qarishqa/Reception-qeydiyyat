-- Fix customer delete by allowing service role to delete customers
-- This is needed for edge functions that use service role

-- Allow service role to delete any customer (for edge functions)
CREATE POLICY "Service role can delete customers" ON public.customers
  FOR DELETE TO service_role USING (true);

-- Also ensure the edge function can bypass RLS if needed
-- by granting necessary permissions to service role
GRANT DELETE ON public.customers TO service_role;