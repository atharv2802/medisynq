// import { useEffect, useRef } from 'react';
// import { useRouter } from 'next/router';
// import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// export default function AuthCallback() {
//   const router = useRouter();
//   const supabase = createClientComponentClient();
//   const isProcessing = useRef(false);

//   useEffect(() => {
//     const handleCallback = async () => {
//       // Prevent multiple executions
//       if (isProcessing.current) return;
//       isProcessing.current = true;

//       try {
//         // Wait for 2 seconds to ensure the session is ready
//         await new Promise(resolve => setTimeout(resolve, 2000));

//         const { data: { session } } = await supabase.auth.getSession();
        
//         if (!session?.user) {
//           console.error('No session found');
//           router.push('/login');
//           return;
//         }

//         // Get the role from user metadata instead of making another request
//         const role = session.user.user_metadata.role || 'patient';

//         // Redirect based on role
//         if (role === 'doctor') {
//           router.push('/dashboard/doctor');
//         } else {
//           router.push('/dashboard/patient');
//         }
//       } catch (err) {
//         console.error('Callback error:', err);
//         // If we hit a rate limit, wait longer and try again
//         if (err instanceof Error && err.message.includes('rate limit')) {
//           await new Promise(resolve => setTimeout(resolve, 5000));
//           router.push('/dashboard/patient');
//           return;
//         }
//         router.push('/login');
//       } finally {
//         // Reset the processing flag after a delay to prevent immediate re-execution
//         setTimeout(() => {
//           isProcessing.current = false;
//         }, 1000);
//       }
//     };

//     // Only run if we're not already processing
//     if (!isProcessing.current) {
//       handleCallback();
//     }

//     // Cleanup function
//     return () => {
//       isProcessing.current = false;
//     };
//   }, [router, supabase]);

//   return (
//     <div className="min-h-screen flex items-center justify-center">
//       <div className="text-center">
//         <h1 className="text-2xl font-bold mb-4">Processing your request...</h1>
//         <p className="text-gray-600">Please wait while we set up your account.</p>
//       </div>
//     </div>
//   );
// } 