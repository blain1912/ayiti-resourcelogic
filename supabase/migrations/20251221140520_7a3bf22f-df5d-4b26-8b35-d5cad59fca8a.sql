-- Add badge validity duration field to organizations table (in months)
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS badge_validity_months INTEGER DEFAULT 12;