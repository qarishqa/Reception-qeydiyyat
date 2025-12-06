-- Add social_media_platform column to customers table
-- This column stores the specific social media platform when ad_source is "Sosial media"

ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS social_media_platform TEXT;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_customers_social_media_platform ON public.customers(social_media_platform);

-- Add comment to column for documentation
COMMENT ON COLUMN public.customers.social_media_platform IS 'Specific social media platform (Instagram, Facebook, TikTok, etc.) when ad_source is "Sosial media"';

