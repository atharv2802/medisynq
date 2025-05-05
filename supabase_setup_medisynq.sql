-- Drop existing tables if they exist
DROP TABLE IF EXISTS public.appointments CASCADE;
DROP TABLE IF EXISTS public.doctors CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.records CASCADE;
DROP VIEW IF EXISTS public.doctors_view CASCADE;

-- Drop all existing storage policies and triggers
DROP POLICY IF EXISTS "Patients can upload their own files" ON storage.objects;
DROP POLICY IF EXISTS "Patients can view their own files" ON storage.objects;
DROP POLICY IF EXISTS "Doctors can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Doctors can view files" ON storage.objects;
DROP POLICY IF EXISTS "Allow access to signed URLs" ON storage.objects;
DROP POLICY IF EXISTS "Allow file operations" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated file operations" ON storage.objects;
DROP TRIGGER IF EXISTS ensure_patient_folder ON storage.objects;
DROP FUNCTION IF EXISTS handle_file_upload();
DROP FUNCTION IF EXISTS generate_unique_filename();

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT,
  role TEXT DEFAULT 'patient',
  created_at TIMESTAMP DEFAULT now(),

  -- Personal info
  full_name TEXT,
  dob DATE,
  phone TEXT,
  address TEXT,
  gender TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,

  -- Medical info
  insurance_provider TEXT,
  insurance_policy_number TEXT,
  allergies TEXT,
  past_medical_history TEXT
);

-- Drop appointment_date column if it exists
ALTER TABLE IF EXISTS public.appointments DROP COLUMN IF EXISTS appointment_date;

-- Create appointments table
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doctor_id UUID NOT NULL,
    patient_id UUID NOT NULL,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    comments TEXT,
    cancelled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create records table with updated schema and proper relationships
CREATE TABLE IF NOT EXISTS public.records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES auth.users(id),
  doctor_id UUID REFERENCES auth.users(id),
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  file_path TEXT NOT NULL,
  summary TEXT,
  ai_summary TEXT,
  created_at TIMESTAMP DEFAULT now(),
  -- Add foreign key constraints
  CONSTRAINT fk_records_patient
    FOREIGN KEY (patient_id)
    REFERENCES public.profiles(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_records_doctor
    FOREIGN KEY (doctor_id)
    REFERENCES public.profiles(id)
    ON DELETE CASCADE
);

-- Create doctors view
CREATE OR REPLACE VIEW public.doctors_view AS
SELECT 
    p.id,
    p.full_name,
    p.email,
    p.phone,
    p.gender,
    p.created_at,
    COUNT(DISTINCT a.id) as total_appointments,
    COUNT(DISTINCT CASE WHEN a.cancelled = false THEN a.id END) as active_appointments
FROM 
    public.profiles p
LEFT JOIN 
    public.appointments a ON p.id = a.doctor_id
WHERE 
    p.role = 'doctor'
GROUP BY 
    p.id, p.full_name, p.email, p.phone, p.gender, p.created_at;

-- Add foreign key constraints for appointments
ALTER TABLE public.appointments
    ADD CONSTRAINT fk_appointments_doctor
    FOREIGN KEY (doctor_id)
    REFERENCES public.profiles(id)
    ON DELETE CASCADE;

ALTER TABLE public.appointments
    ADD CONSTRAINT fk_appointments_patient
    FOREIGN KEY (patient_id)
    REFERENCES public.profiles(id)
    ON DELETE CASCADE;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON public.appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON public.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments(date);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
-- Profiles
CREATE POLICY "Patient can view own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Patient can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Records
CREATE POLICY "Patient reads own records"
  ON public.records
  FOR SELECT
  USING (auth.uid() = patient_id);

CREATE POLICY "Doctor reads own patients' records"
  ON public.records
  FOR SELECT
  USING (auth.uid() = doctor_id);

-- Add policy for authenticated users to insert records
CREATE POLICY "Allow record creation"
  ON public.records
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Appointments
CREATE POLICY "Patients can view their own appointments"
    ON public.appointments
    FOR SELECT
    USING (patient_id = auth.uid());

CREATE POLICY "Doctors can view their patients' appointments"
    ON public.appointments
    FOR SELECT
    USING (doctor_id = auth.uid());

CREATE POLICY "Patients can create appointments"
    ON public.appointments
    FOR INSERT
    WITH CHECK (patient_id = auth.uid());

CREATE POLICY "Patients can update their own appointments"
    ON public.appointments
    FOR UPDATE
    USING (patient_id = auth.uid());

CREATE POLICY "Patients can delete their own appointments"
    ON public.appointments
    FOR DELETE
    USING (patient_id = auth.uid());

-- Storage setup
-- Create bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('ehr-files', 'ehr-files', false)
ON CONFLICT (id) DO NOTHING;

-- Create base folder
INSERT INTO storage.objects (bucket_id, name, owner)
VALUES ('ehr-files', 'patient-docs/', auth.uid())
ON CONFLICT (bucket_id, name) DO NOTHING;

-- Create simple, permissive storage policy
CREATE POLICY "Allow authenticated file operations"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'ehr-files')
WITH CHECK (bucket_id = 'ehr-files');

-- Trigger for new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id, email, role,
    full_name, dob, phone, address, gender,
    emergency_contact_name, emergency_contact_phone,
    insurance_provider, insurance_policy_number,
    allergies, past_medical_history, past_history_file
  )
  VALUES (
    NEW.id,
    NEW.email,
    'patient',
    NEW.raw_user_meta_data ->> 'full_name',
    (NEW.raw_user_meta_data ->> 'dob')::date,
    NEW.raw_user_meta_data ->> 'phone',
    NEW.raw_user_meta_data ->> 'address',
    NEW.raw_user_meta_data ->> 'gender',
    NEW.raw_user_meta_data ->> 'emergency_contact_name',
    NEW.raw_user_meta_data ->> 'emergency_contact_phone',
    NEW.raw_user_meta_data ->> 'insurance_provider',
    NEW.raw_user_meta_data ->> 'insurance_policy_number',
    NEW.raw_user_meta_data ->> 'allergies',
    NEW.raw_user_meta_data ->> 'past_medical_history',
    NEW.raw_user_meta_data ->> 'past_history_file'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();