-- Create storage bucket for organization logos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('organization-logos', 'organization-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view logos (public bucket)
CREATE POLICY "Organization logos are publicly viewable"
ON storage.objects FOR SELECT
USING (bucket_id = 'organization-logos');

-- Allow authenticated users to upload logos for their organization
CREATE POLICY "Admins can upload organization logos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'organization-logos' AND auth.role() = 'authenticated');

-- Allow authenticated users to update logos
CREATE POLICY "Admins can update organization logos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'organization-logos' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete logos
CREATE POLICY "Admins can delete organization logos"
ON storage.objects FOR DELETE
USING (bucket_id = 'organization-logos' AND auth.role() = 'authenticated');