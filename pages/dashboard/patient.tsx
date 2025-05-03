// import { useSession, useSupabaseClient } from '@supabase/ssr';
// import { useEffect, useState } from 'react';
// import Link from 'next/link';

// export default function PatientDashboard() {
//   const session = useSession();
//   const supabase = useSupabaseClient();
//   const [records, setRecords] = useState<any[]>([]);

//   useEffect(() => {
//     const loadRecords = async () => {
//       const { data } = await supabase
//         .from('records')
//         .select('*')
//         .eq('patient_id', session?.user.id);
//       if (data) {
//         const signed = await Promise.all(
//           data.map(async (r) => {
//             const path = r.file_url?.replace(/^.*ehr-files\//, '');
//             const { data: signedData } = await supabase.storage
//               .from('ehr-files')
//               .createSignedUrl(path, 120);
//             return { ...r, signedUrl: signedData?.signedUrl };
//           })
//         );
//         setRecords(signed);
//       }
//     };
//     if (session) loadRecords();
//   }, [session]);

//   return (
//     <div>
//       <h1>Welcome, {session?.user.email}</h1>
//       <Link href="/dashboard/appointments">📅 Book Appointment</Link>
//       <h2>Your Medical Records:</h2>
//       <ul>
//         {records.map((r, i) => (
//           <li key={r.id}>
//             Summary: {r.summary}<br />
//             {r.signedUrl && <a href={r.signedUrl}>Download</a>}
//           </li>
//         ))}
//       </ul>
//     </div>
//   );
// }

// Example: pages/dashboard/patient.tsx

export default function PatientDashboard() {
    return <div>Coming Soon: Patient Dashboard</div>;
  }
  