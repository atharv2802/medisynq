import Link from 'next/link';
import Image from 'next/image';
import Head from 'next/head';
import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/router';
import { getSiteUrl } from '../lib/utils';

export default function Signup() {
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [gender, setGender] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [insuranceProvider, setInsuranceProvider] = useState('');
  const [insurancePolicy, setInsurancePolicy] = useState('');
  const [allergies, setAllergies] = useState('');
  const [pastHistory, setPastHistory] = useState('');
  const [historyFile, setHistoryFile] = useState<File | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const supabase = createClientComponentClient({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  });
  const router = useRouter();

  function validateEmail(email: string) {
    return /.+@.+\..+/.test(email) && email.includes('.com');
  }

  function validatePassword(password: string) {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(password);
  }

  function validatePhone(phone: string) {
    return /^\d{10}$/.test(phone);
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setError(null);

    // Required field checks
    if (!fullName || !dob || !phone || !address || !gender || !emergencyName || !emergencyPhone || !email || !password) {
      setValidationError('Please fill all required fields.');
      return;
    }
    if (!validateEmail(email)) {
      setValidationError('Please enter a valid email address.');
      return;
    }
    if (!validatePassword(password)) {
      setValidationError('Password must be at least 8 characters, include uppercase, lowercase, number, and special character.');
      return;
    }
    if (!validatePhone(phone)) {
      setValidationError('Phone number must be exactly 10 digits.');
      return;
    }
    if (!validatePhone(emergencyPhone)) {
      setValidationError('Emergency contact phone number must be exactly 10 digits.');
      return;
    }

    setLoading(true);

    let file_url = null;
    if (historyFile) {
      const filePath = `patient-docs/${Date.now()}_${historyFile.name}`;
      const { error: uploadErr } = await supabase.storage
        .from('ehr-files')
        .upload(filePath, historyFile);
      if (uploadErr) {
        setError('File upload failed');
        setLoading(false);
        return;
      }
      file_url = `ehr-files/${filePath}`;
    }

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          dob,
          phone,
          address,
          gender,
          emergency_contact_name: emergencyName,
          emergency_contact_phone: emergencyPhone,
          insurance_provider: insuranceProvider,
          insurance_policy_number: insurancePolicy,
          allergies,
          past_medical_history: pastHistory,
          past_history_file: file_url,
          role: 'patient'
        },
        emailRedirectTo: `${getSiteUrl()}/auth/callback`
      }
    });

    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
    } else {
      alert('Check your email for the confirmation link!');
      router.push('/login');
    }
  };

  return (
    <>
      <Head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet" />
      </Head>
      <div className="min-h-screen bg-white font-sans relative">
        {/* Dotted background */}
        <div className="absolute inset-0 pointer-events-none z-0" style={{
          backgroundImage: "radial-gradient(#d1d5db 1px, transparent 1px)",
          backgroundSize: "20px 20px"
        }} />
        {/* Header */}
        <header className="relative z-10 flex justify-between items-center px-8 py-4">
          <div className="flex items-center gap-2">
            <Image src="/icon.svg" alt="Medisynq Logo" width={32} height={32} />
            <span className="font-bold text-lg text-gray-700 font-mono tracking-tight">Medisynq</span>
          </div>
          <nav className="flex gap-2">
            <Link href="/" className="px-3 py-1 rounded bg-indigo-50 text-indigo-600 font-mono text-sm hover:bg-indigo-100">Home</Link>
            <Link href="/login" className="px-3 py-1 rounded bg-indigo-50 text-indigo-600 font-mono text-sm hover:bg-indigo-100">Login</Link>
          </nav>
        </header>
        {/* Centered Card */}
        <main className="relative z-10 flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="relative">
            {/* Blue offset shadow */}
            <div className="absolute top-2 left-2 w-full h-full rounded-2xl bg-indigo-200 opacity-80 -z-10" />
            <div className="bg-white rounded-2xl shadow-lg px-10 py-8 w-[430px] font-sans border border-gray-100">
              <h2 className="text-xl font-bold text-center mb-8 text-gray-700 font-mono tracking-wide">Create your Medisynq account</h2>
              <form className="space-y-4" onSubmit={handleSignup}>
                <div>
                  <label className="block mb-1 font-semibold text-gray-600 font-mono">Full Name<span className="text-red-500">*</span></label>
                  <input type="text" required className="w-full px-3 py-2 border border-gray-300 rounded font-mono focus:outline-none focus:ring-2 focus:ring-indigo-200" placeholder="Full Name" value={fullName} onChange={e => setFullName(e.target.value)} />
                </div>
                <div>
                  <label className="block mb-1 font-semibold text-gray-600 font-mono">Email<span className="text-red-500">*</span></label>
                  <input type="email" required className="w-full px-3 py-2 border border-gray-300 rounded font-mono focus:outline-none focus:ring-2 focus:ring-indigo-200" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <div>
                  <label className="block mb-1 font-semibold text-gray-600 font-mono">Password<span className="text-red-500">*</span></label>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      required 
                      className="w-full px-3 py-2 border border-gray-300 rounded font-mono focus:outline-none focus:ring-2 focus:ring-indigo-200" 
                      placeholder="Password" 
                      value={password} 
                      onChange={e => setPassword(e.target.value)} 
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block mb-1 font-semibold text-gray-600 font-mono">Date of Birth<span className="text-red-500">*</span></label>
                  <input type="date" required className="w-full px-3 py-2 border border-gray-300 rounded font-mono focus:outline-none focus:ring-2 focus:ring-indigo-200" value={dob} onChange={e => setDob(e.target.value)} />
                </div>
                <div>
                  <label className="block mb-1 font-semibold text-gray-600 font-mono">Phone<span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    required 
                    className="w-full px-3 py-2 border border-gray-300 rounded font-mono focus:outline-none focus:ring-2 focus:ring-indigo-200" 
                    placeholder="Phone (10 digits)" 
                    value={phone} 
                    onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} 
                    maxLength={10}
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold text-gray-600 font-mono">Address<span className="text-red-500">*</span></label>
                  <input type="text" required className="w-full px-3 py-2 border border-gray-300 rounded font-mono focus:outline-none focus:ring-2 focus:ring-indigo-200" placeholder="Address" value={address} onChange={e => setAddress(e.target.value)} />
                </div>
                <div>
                  <label className="block mb-1 font-semibold text-gray-600 font-mono">Gender<span className="text-red-500">*</span></label>
                  <select required className="w-full px-3 py-2 border border-gray-300 rounded font-mono focus:outline-none focus:ring-2 focus:ring-indigo-200" value={gender} onChange={e => setGender(e.target.value)}>
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Others">Others</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1 font-semibold text-gray-600 font-mono">Emergency Contact Name<span className="text-red-500">*</span></label>
                  <input type="text" required className="w-full px-3 py-2 border border-gray-300 rounded font-mono focus:outline-none focus:ring-2 focus:ring-indigo-200" placeholder="Emergency Contact Name" value={emergencyName} onChange={e => setEmergencyName(e.target.value)} />
                </div>
                <div>
                  <label className="block mb-1 font-semibold text-gray-600 font-mono">Emergency Contact Phone<span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    required 
                    className="w-full px-3 py-2 border border-gray-300 rounded font-mono focus:outline-none focus:ring-2 focus:ring-indigo-200" 
                    placeholder="Phone (10 digits)" 
                    value={emergencyPhone} 
                    onChange={e => setEmergencyPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} 
                    maxLength={10}
                  />
                </div>
                
                <div>
                  <label className="block mb-1 font-semibold text-gray-600 font-mono">Insurance Provider</label>
                  <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded font-mono focus:outline-none focus:ring-2 focus:ring-indigo-200" placeholder="Insurance Provider" value={insuranceProvider} onChange={e => setInsuranceProvider(e.target.value)} />
                </div>
                <div>
                  <label className="block mb-1 font-semibold text-gray-600 font-mono">Insurance Policy Number</label>
                  <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded font-mono focus:outline-none focus:ring-2 focus:ring-indigo-200" placeholder="Insurance Policy Number" value={insurancePolicy} onChange={e => setInsurancePolicy(e.target.value)} />
                </div>
                <div>
                  <label className="block mb-1 font-semibold text-gray-600 font-mono">Allergies</label>
                  <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded font-mono focus:outline-none focus:ring-2 focus:ring-indigo-200" placeholder="Allergies" value={allergies} onChange={e => setAllergies(e.target.value)} />
                </div>
                <div>
                  <label className="block mb-1 font-semibold text-gray-600 font-mono">Past Medical History</label>
                  <textarea className="w-full px-3 py-2 border border-gray-300 rounded font-mono focus:outline-none focus:ring-2 focus:ring-indigo-200" placeholder="Past Medical History" value={pastHistory} onChange={e => setPastHistory(e.target.value)} />
                </div>
                <div>
                  <label className="block mb-1 font-semibold text-gray-600 font-mono">Past History File</label>
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <svg className="w-8 h-8 mb-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                          <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                        </svg>
                        <p className="mb-2 text-sm text-gray-500">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-gray-500">PDF, DOC, DOCX (MAX. 5MB)</p>
                      </div>
                      <input 
                        type="file" 
                        className="hidden" 
                        onChange={e => setHistoryFile(e.target.files?.[0] || null)} 
                      />
                    </label>
                  </div>
                  {historyFile && (
                    <p className="mt-2 text-sm text-gray-600">
                      Selected file: {historyFile.name}
                    </p>
                  )}
                </div>
                {validationError && <div className="text-red-500 text-sm">{validationError}</div>}
                {error && <div className="text-red-500 text-sm">{error}</div>}
                <button type="submit" className="w-full py-2 bg-indigo-500 text-white font-bold rounded font-mono hover:bg-indigo-600 transition" disabled={loading}>{loading ? 'Signing Up...' : 'Sign Up'}</button>
              </form>
              <div className="mt-6 flex flex-col items-center gap-2">
                <Link href="/login" className="text-indigo-600 hover:underline text-sm font-mono">Already have an account? Login</Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
} 