-- Allow system/service role to insert profiles (needed for edge functions)
CREATE POLICY "Service role can insert profiles" 
ON public.profiles 
FOR INSERT 
TO service_role 
WITH CHECK (true);

-- Allow authenticated users to insert their own profile (for edge function with user context)
CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);