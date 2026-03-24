INSERT INTO storage.buckets (id, name, public)
VALUES ('document-emails', 'document-emails', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload document PDFs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'document-emails');

CREATE POLICY "Users can read document PDFs via signed URLs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'document-emails');