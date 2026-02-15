
-- Create storage bucket for club logos
INSERT INTO storage.buckets (id, name, public) VALUES ('club-logos', 'club-logos', true);

-- Allow authenticated users to upload their own logos
CREATE POLICY "Users can upload club logos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'club-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow public read access
CREATE POLICY "Club logos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'club-logos');

-- Allow users to update their own logos
CREATE POLICY "Users can update own logos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'club-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own logos
CREATE POLICY "Users can delete own logos"
ON storage.objects FOR DELETE
USING (bucket_id = 'club-logos' AND auth.uid()::text = (storage.foldername(name))[1]);
