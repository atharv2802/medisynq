import Link from 'next/link';
import Image from 'next/image';
import Head from 'next/head';
import * as React from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/router';

function validateEmail(email: string) {
  return /.+@.+\..+/.test(email) && email.includes('.com');
}

export default function Login() {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [validationError, setValidationError] = React.useState<string | null>(null);

  const supabase = createClientComponentClient({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  });

  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setValidationError(null);
    setError(null);

    if (!validateEmail(email)) {
      setValidationError('Please enter a valid email address.');
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setLoading(false);
      setError(error.message);
      return;
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      setLoading(false);
      setError(`Error fetching user: ${userError?.message || 'User not found'}`);
      return;
    }

    let role = user.user_metadata?.role;

    if (!role) {
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;

        if (profileData?.role) {
          const { error: updateError } = await supabase.auth.updateUser({
            data: { role: profileData.role }
          });

          if (updateError) throw updateError;

          role = profileData.role;
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
      }
    }

    setLoading(false);

    if (role === 'doctor') {
      router.push('/dashboard/doctor');
    } else if (role === 'patient') {
      router.push('/dashboard/patient');
    } else {
      setError('Unable to determine user role. Please contact support.');
    }
  };

  return (
    <>
      <Head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet" />
      </Head>
      <div className="min-h-screen bg-white font-sans relative">
        <div className="absolute inset-0 pointer-events-none z-0" style={{
          backgroundImage: "radial-gradient(#d1d5db 1px, transparent 1px)",
          backgroundSize: "20px 20px"
        }} />
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
        <main className="relative z-10 flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="relative">
            <div className="absolute top-2 left-2 w-full h-full rounded-2xl bg-indigo-200 opacity-80 -z-10" />
            <div className="bg-white rounded-2xl shadow-lg px-10 py-8 w-[400px] font-sans border border-gray-100">
              <h2 className="text-xl font-bold text-center mb-8 text-gray-700 font-mono tracking-wide">Welcome back to Medisynq.</h2>
              <form className="space-y-5" onSubmit={handleLogin}>
                <div>
                  <label className="block mb-1 font-semibold text-gray-600 font-mono">Email</label>
                  <input
                    type="email"
                    className="w-full px-3 py-2 border border-gray-300 rounded font-mono focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="Email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold text-gray-600 font-mono">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
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
                {validationError && <div className="text-red-500 text-sm">{validationError}</div>}
                {error && <div className="text-red-500 text-sm">{error}</div>}
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-2 font-bold rounded font-mono transition ${
                    loading ? 'bg-indigo-300 cursor-not-allowed' : 'bg-indigo-500 hover:bg-indigo-600 text-white'
                  }`}
                >
                  {loading ? 'Logging in...' : 'Login'}
                </button>
              </form>
              <div className="mt-6 flex flex-col items-center gap-2">
                <Link href="/signup" className="text-indigo-600 hover:underline text-sm font-mono">Don't have an account? Sign Up</Link>
                <Link href="/forgot-password" className="text-indigo-400 hover:underline text-sm font-mono">Forgot Password?</Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}





// import Link from 'next/link';
// import Image from 'next/image';
// import Head from 'next/head';
// import * as React from 'react';
// import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
// import { useRouter } from 'next/router';

// function validateEmail(email: string) {
//   return /.+@.+\..+/.test(email) && email.includes('.com');
// }

// export default function Login() {
//   const [email, setEmail] = React.useState('');
//   const [password, setPassword] = React.useState('');
//   const [showPassword, setShowPassword] = React.useState(false);
//   const [loading, setLoading] = React.useState(false);
//   const [error, setError] = React.useState<string | null>(null);
//   const [validationError, setValidationError] = React.useState<string | null>(null);

//   const supabase = createClientComponentClient({
//     supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
//     supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
//   });
//   const router = useRouter();

//   const handleLogin = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setValidationError(null);
//     setError(null);
//     if (!validateEmail(email)) {
//       setValidationError('Please enter a valid email address.');
//       return;
//     }
//     setLoading(true);
//     const { error } = await supabase.auth.signInWithPassword({
//       email,
//       password,
//     });
//     setLoading(false);
//     if (error) {
//       setError(error.message);
//     } else {
//       const { data: { user }, error: userError } = await supabase.auth.getUser();
      
//       console.log('User:', user);
//       console.log('User Error:', userError);
//       console.log('User Metadata:', user?.user_metadata);

//       if (userError) {
//         console.error('Error fetching user:', userError);
//         setError(`Error fetching user: ${userError.message}`);
//         return;
//       }

//       // Check if user has a role in their metadata
//       let role = user?.user_metadata?.role;
      
//       // If no role, try to determine from profiles table
//       if (!role) {
//         try {
//           const { data: profileData, error: profileError } = await supabase
//             .from('profiles')
//             .select('role')
//             .eq('id', user?.id)
//             .single();

//           if (profileError) throw profileError;

//           if (profileData?.role) {
//             // Update user metadata with role from profiles
//             const { error: updateError } = await supabase.auth.updateUser({
//               data: { role: profileData.role }
//             });

//             if (updateError) throw updateError;

//             role = profileData.role;
//           }
//         } catch (error) {
//           console.error('Error fetching profile:', error);
//         }
//       }
      
//       console.log('Determined Role:', role);

//       console.log('Final Role:', role);
//       console.log('User ID:', user?.id);
//       console.log('Full User Object:', JSON.stringify(user, null, 2));

//       if (role === 'doctor') {
//         console.log('Routing to doctor dashboard');
//         window.location.href = '/dashboard/doctor';
//       } else if (role === 'patient') {
//         console.log('Routing to patient dashboard');
//         window.location.href = '/dashboard/patient';
//       } else {
//         console.error('No role found', { user, metadata: user?.user_metadata });
//         setError('Unable to determine user role. Please contact support.');
//       }
//     }
//   };

//   return (
//     <>
//       <Head>
//         <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet" />
//       </Head>
//       <div className="min-h-screen bg-white font-sans relative">
//         {/* Dotted background */}
//         <div className="absolute inset-0 pointer-events-none z-0" style={{
//           backgroundImage: "radial-gradient(#d1d5db 1px, transparent 1px)",
//           backgroundSize: "20px 20px"
//         }} />
//         {/* Header */}
//         <header className="relative z-10 flex justify-between items-center px-8 py-4">
//           <div className="flex items-center gap-2">
//             <Image src="/icon.svg" alt="Medisynq Logo" width={32} height={32} />
//             <span className="font-bold text-lg text-gray-700 font-mono tracking-tight">Medisynq</span>
//           </div>
//           <nav className="flex gap-2">
//             <Link href="/" className="px-3 py-1 rounded bg-indigo-50 text-indigo-600 font-mono text-sm hover:bg-indigo-100">Home</Link>
//             <Link href="/login" className="px-3 py-1 rounded bg-indigo-50 text-indigo-600 font-mono text-sm hover:bg-indigo-100">Login</Link>
//           </nav>
//         </header>
//         {/* Centered Card */}
//         <main className="relative z-10 flex items-center justify-center min-h-[calc(100vh-80px)]">
//           <div className="relative">
//             {/* Blue offset shadow */}
//             <div className="absolute top-2 left-2 w-full h-full rounded-2xl bg-indigo-200 opacity-80 -z-10" />
//             <div className="bg-white rounded-2xl shadow-lg px-10 py-8 w-[400px] font-sans border border-gray-100">
//               <h2 className="text-xl font-bold text-center mb-8 text-gray-700 font-mono tracking-wide">Welcome back to Medisynq.</h2>
//               <form className="space-y-5" onSubmit={handleLogin}>
//                 <div>
//                   <label className="block mb-1 font-semibold text-gray-600 font-mono">Email</label>
//                   <input
//                     type="email"
//                     className="w-full px-3 py-2 border border-gray-300 rounded font-mono focus:outline-none focus:ring-2 focus:ring-indigo-200"
//                     placeholder="Email"
//                     value={email}
//                     onChange={e => setEmail(e.target.value)}
//                   />
//                 </div>
//                 <div>
//                   <label className="block mb-1 font-semibold text-gray-600 font-mono">Password</label>
//                   <div className="relative">
//                     <input
//                       type={showPassword ? "text" : "password"}
//                       className="w-full px-3 py-2 border border-gray-300 rounded font-mono focus:outline-none focus:ring-2 focus:ring-indigo-200"
//                       placeholder="Password"
//                       value={password}
//                       onChange={e => setPassword(e.target.value)}
//                     />
//                     <button
//                       type="button"
//                       onClick={() => setShowPassword(!showPassword)}
//                       className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
//                     >
//                       {showPassword ? "Hide" : "Show"}
//                     </button>
//                   </div>
//                 </div>
//                 {validationError && <div className="text-red-500 text-sm">{validationError}</div>}
//                 {error && <div className="text-red-500 text-sm">{error}</div>}
//                 <button
//                   type="submit"
//                   className="w-full py-2 bg-indigo-500 text-white font-bold rounded font-mono hover:bg-indigo-600 transition"
//                   disabled={loading}
//                 >
//                   {loading ? 'Logging in...' : 'Login'}
//                 </button>
//               </form>
//               <div className="mt-6 flex flex-col items-center gap-2">
//                 <Link href="/signup" className="text-indigo-600 hover:underline text-sm font-mono">Don't have an account? Sign Up</Link>
//                 <Link href="/forgot-password" className="text-indigo-400 hover:underline text-sm font-mono">Forgot Password?</Link>
//               </div>
//             </div>
//           </div>
//         </main>
//       </div>
//     </>
//   );
// } 