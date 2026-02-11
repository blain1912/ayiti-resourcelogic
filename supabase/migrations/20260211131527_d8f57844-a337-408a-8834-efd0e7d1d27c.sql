
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS document_header_text text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS document_city text DEFAULT 'Port-au-Prince',
ADD COLUMN IF NOT EXISTS default_signer_name text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS default_signer_title text DEFAULT NULL;
