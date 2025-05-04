-- Create storage bucket for patient documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('ehr-files', 'ehr-files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for ehr-files bucket
CREATE POLICY "Patients can upload their own files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'ehr-files' AND
  (storage.foldername(name))[1] = 'patient-docs' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "Doctors can upload files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'ehr-files' AND
  (storage.foldername(name))[1] = 'patient-docs' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'doctor'
  )
);

CREATE POLICY "Doctors can view files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'ehr-files' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'doctor'
  )
);

CREATE POLICY "Patients can view their own files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'ehr-files' AND
  (storage.foldername(name))[1] = 'patient-docs' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Create a function to generate a unique filename
CREATE OR REPLACE FUNCTION generate_unique_filename(original_name TEXT)
RETURNS TEXT AS $$
DECLARE
  timestamp TEXT;
  extension TEXT;
BEGIN
  timestamp := EXTRACT(EPOCH FROM NOW())::TEXT;
  extension := regexp_replace(original_name, '^.*\.', '');
  RETURN 'patient-docs/' || auth.uid()::text || '/' || timestamp || '_' || original_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 