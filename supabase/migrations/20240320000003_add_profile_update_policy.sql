-- Add RLS policy for patients to update their own profiles
CREATE POLICY "Patient can update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id); 