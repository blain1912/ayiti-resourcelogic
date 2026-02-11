
-- Add workflow fields to correspondence_records
ALTER TABLE public.correspondence_records
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS validated_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS validated_at timestamptz,
ADD COLUMN IF NOT EXISTS signature_name text,
ADD COLUMN IF NOT EXISTS signature_title text,
ADD COLUMN IF NOT EXISTS signed_at timestamptz,
ADD COLUMN IF NOT EXISTS document_type text DEFAULT 'lettre',
ADD COLUMN IF NOT EXISTS category_label text;
