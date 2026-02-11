
-- Add document_type column to correspondence_templates
ALTER TABLE public.correspondence_templates
ADD COLUMN document_type TEXT NOT NULL DEFAULT 'lettre';

-- Update category enum to include more relevant categories
-- Since we can't easily modify enums, we'll add a text-based category_label column for flexibility
ALTER TABLE public.correspondence_templates
ADD COLUMN category_label TEXT;
