import Link from 'next/link';
import Image from 'next/image';
import Head from 'next/head';
import * as React from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { getSiteUrl } from '../lib/utils';

function validateEmail(email: string) {
  return /.+@.+\..+/.test(email) && email.includes('.com');
}

export default function ForgotPassword() {
  const [email, setEmail] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [validationError, setValidationError] = React.useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setError(null);
    setSuccess(null);
    if (!validateEmail(email)) {
      setValidationError('Please enter a valid email address.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${getSiteUrl()}/auth/reset-password`
    });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSuccess('Password reset email sent! Check your inbox.');
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
            <div className="bg-white rounded-2xl shadow-lg px-10 py-8 w-[400px] font-sans border border-gray-100">
              <h2 className="text-xl font-bold text-center mb-8 text-gray-700 font-mono tracking-wide">Reset your password</h2>
              <form className="space-y-5" onSubmit={handleReset}>
                <div>
                  <label className="block mb-1 font-semibold text-gray-600 font-mono">Email</label>
                  <input
                    type="email"
                    className="w-full px-3 py-2 border border-gray-300 rounded font-mono focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="Enter your email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
                {validationError && <div className="text-red-500 text-sm">{validationError}</div>}
                {error && <div className="text-red-500 text-sm">{error}</div>}
                {success && <div className="text-green-600 text-sm">{success}</div>}
                <button
                  type="submit"
                  className="w-full py-2 bg-indigo-500 text-white font-bold rounded font-mono hover:bg-indigo-600 transition"
                  disabled={loading}
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
              <div className="mt-6 flex flex-col items-center gap-2">
                <Link href="/login" className="text-indigo-600 hover:underline text-sm font-mono">Back to Login</Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
} 