-- Add DELETE policies for customers table

-- Allow users to delete customers they created
CREATE POLICY "Users can delete customers they created" ON public.customers
  FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- Allow admins to delete any customer
CREATE POLICY "Admins can delete any customer" ON public.customers
  FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.user_id = auth.uid() AND p.role = 'admin'
    )
  );