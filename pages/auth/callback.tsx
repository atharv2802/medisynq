import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function AuthCallback() {
  const router = useRouter();
  const supabase = createClientComponentClient({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  });

  useEffect(() => {
    const handleCallback = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('No session found');
        router.push('/login');
      } else {
        // Check user role and redirect accordingly
        const role = session.user.user_metadata.role;
        if (role === 'patient') {
          router.push('/dashboard/patient');
        } else if (role === 'doctor') {
          router.push('/dashboard/doctor');
        } else {
          // Default to patient dashboard if role is not set
          router.push('/dashboard/patient');
        }
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Verifying your email...</h1>
        <p className="text-gray-600">Please wait while we confirm your email address.</p>
      </div>
    </div>
  );
} 