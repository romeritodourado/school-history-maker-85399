-- Create a function to promote a user to superadmin
CREATE OR REPLACE FUNCTION public.promote_to_superadmin(user_email TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Get user ID from email
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = user_email;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found with email: %', user_email;
  END IF;

  -- Insert or update the superadmin role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, 'superadmin')
  ON CONFLICT (user_id, role) DO NOTHING;

END;
$$;

-- Promote the user to superadmin if they exist
DO $$
BEGIN
  -- Try to promote, but don't fail if user doesn't exist yet
  BEGIN
    PERFORM public.promote_to_superadmin('romeritorms@hotmail.com');
  EXCEPTION
    WHEN OTHERS THEN
      -- User doesn't exist yet, will be promoted after signup
      NULL;
  END;
END $$;