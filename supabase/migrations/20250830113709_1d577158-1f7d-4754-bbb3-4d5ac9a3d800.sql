-- Confirm all existing users so they can login
UPDATE auth.users 
SET email_confirmed_at = NOW(), 
    confirmed_at = NOW() 
WHERE email_confirmed_at IS NULL;