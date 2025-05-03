-- ============================
-- 1. CREATE TABLES
-- ============================

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
  past_medical_history TEXT,
  past_history_file TEXT
);

CREATE TABLE IF NOT EXISTS public.records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES auth.users(id),
  doctor_id UUID REFERENCES auth.users(id),
  summary TEXT,
  file_url TEXT,
  ai_summary TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES auth.users(id),
  doctor_id UUID REFERENCES auth.users(id),
  date TIMESTAMP
);

-- ============================
-- 2. ENABLE RLS
-- ============================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- ============================
-- 3. RLS POLICIES
-- ============================

-- Profiles
CREATE POLICY "Patient can view own profile"
  ON public.profiles
  FOR SELECT
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

-- Appointments
CREATE POLICY "Patient accesses own appointments"
  ON public.appointments
  FOR ALL
  USING (auth.uid() = patient_id);

CREATE POLICY "Doctor can view appointments"
  ON public.appointments
  FOR SELECT
  USING (auth.uid() = doctor_id);

CREATE POLICY "Doctor can delete appointments"
  ON public.appointments
  FOR DELETE
  USING (auth.uid() = doctor_id);

CREATE POLICY "Doctor can update appointments"
  ON public.appointments
  FOR UPDATE
  USING (auth.uid() = doctor_id);


-- ============================
-- 4. STORAGE ACCESS POLICY
-- ============================

CREATE POLICY "Allow access to signed URLs"
  ON storage.objects
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- ============================
-- 5. TRIGGER: Auto-insert profile with extended fields
-- ============================

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
