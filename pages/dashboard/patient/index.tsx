import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/router';
import ProfileTab from './ProfileTab';
import AppointmentsTab from './AppointmentsTab';
import RecordsTab from './RecordsTab';
import Image from 'next/image';

export default function PatientDashboard() {
  const [activeTab, setActiveTab] = useState('profile');
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // First check if we have a session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          throw new Error('Failed to get session');
        }

        if (!session?.user) {
          console.log('No session found, redirecting to login');
          router.push('/login');
          return;
        }

        console.log('Fetching profile for user:', session.user.id);

        // Then fetch the profile with role check
        const { data, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .eq('role', 'patient')  // Ensure the user is a patient
          .single();

        if (profileError) {
          console.error('Profile error:', profileError);
          if (profileError.code === 'PGRST116') {
            // No rows returned - check if user exists but has wrong role
            const { data: userExists } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', session.user.id)
              .single();

            if (userExists) {
              throw new Error(`Access denied. Your account is registered as a ${userExists.role}.`);
            } else {
              throw new Error('Profile not found. Please complete your registration.');
            }
          }
          throw new Error('Failed to load profile. Please try again.');
        }

        if (!data) {
          console.error('No profile data found');
          throw new Error('Profile not found. Please complete your registration.');
        }

        console.log('Profile loaded successfully:', data);
        setProfile(data);
      } catch (err) {
        console.error('Dashboard error:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [router, supabase]);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.push('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Loading...</h1>
          <p className="text-gray-600">Please wait while we load your profile.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-red-600">Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="space-y-2">
            <button
              onClick={() => router.push('/login')}
              className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600"
            >
              Back to Login
            </button>
            <button
              onClick={() => window.location.reload()}
              className="block px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Image
              src="/icon.svg"
              alt="Medisynq Logo"
              width={40}
              height={40}
              className="rounded-full"
            />
            <span className="text-2xl font-bold text-indigo-600">Medisynq</span>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Sidebar */}
            <div className="w-full md:w-64 bg-white rounded-lg shadow p-4">
              <h2 className="text-xl font-bold mb-4">Dashboard</h2>
              <nav className="space-y-2">
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`w-full text-left px-4 py-2 rounded ${
                    activeTab === 'profile' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Profile
                </button>
                <button
                  onClick={() => setActiveTab('appointments')}
                  className={`w-full text-left px-4 py-2 rounded ${
                    activeTab === 'appointments' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Appointments
                </button>
                <button
                  onClick={() => setActiveTab('records')}
                  className={`w-full text-left px-4 py-2 rounded ${
                    activeTab === 'records' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Medical Records
                </button>
              </nav>
            </div>

            {/* Main Content */}
            <div className="flex-1">
              {activeTab === 'profile' && <ProfileTab />}
              {activeTab === 'appointments' && <AppointmentsTab />}
              {activeTab === 'records' && <RecordsTab />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 