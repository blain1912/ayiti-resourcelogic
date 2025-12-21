-- Add badge customization fields to organizations table
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS badge_header_text TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS badge_footer_text TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS badge_border_style TEXT DEFAULT 'solid';