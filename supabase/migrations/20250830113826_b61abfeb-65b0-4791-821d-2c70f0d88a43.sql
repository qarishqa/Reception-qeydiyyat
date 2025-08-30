-- Confirm all existing users so they can login (only update email_confirmed_at)
UPDATE auth.users 
SET email_confirmed_at = NOW()
WHERE email_confirmed_at IS NULL;