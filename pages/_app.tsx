import '../styles/globals.css';
import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { AppProps } from 'next/app';

function MyApp({ Component, pageProps }: AppProps) {
  const [supabaseClient] = useState(() =>
    createClientComponentClient({
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    })
  );

  return (
    <Component {...pageProps} />
  );
}

export default MyApp;
