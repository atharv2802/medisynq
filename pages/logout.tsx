import { useSupabaseClient } from '@supabase/ssr';
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Logout() {
  const supabase = useSupabaseClient();
  const router = useRouter();

  useEffect(() => {
    const logout = async () => {
      await supabase.auth.signOut();
      router.push('/');
    };
    logout();
  }, []);

  return <p>Logging out...</p>;
}