-- Create storage bucket for CVs
INSERT INTO storage.buckets (id, name, public)
VALUES ('cv-documents', 'cv-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own CVs
CREATE POLICY "Users can upload their own CV"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'cv-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to view their own CVs
CREATE POLICY "Users can view their own CV"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'cv-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to update their own CVs
CREATE POLICY "Users can update their own CV"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'cv-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own CVs
CREATE POLICY "Users can delete their own CV"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'cv-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow HR to view CVs in their organization (via service role or RLS on applications table)