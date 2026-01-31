-- Prevent privilege escalation: users must not be able to assign themselves the admin role.

DROP POLICY IF EXISTS "Users can insert their own role" ON public.user_roles;
CREATE POLICY "Users can insert their own role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND role <> 'admin'::public.app_role
);

DROP POLICY IF EXISTS "Users can update their own role" ON public.user_roles;
CREATE POLICY "Users can update their own role"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND role <> 'admin'::public.app_role
);
