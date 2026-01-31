-- Create trigger to automatically insert user role on signup
CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_role();

-- Add policy to allow users to INSERT their own role (for updating it after default creation)
CREATE POLICY "Users can insert their own role"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Add policy to allow users to UPDATE their own role (for changing from default 'user' to selected role)
CREATE POLICY "Users can update their own role"
  ON public.user_roles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);