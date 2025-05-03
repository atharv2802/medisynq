import { useEffect, useState } from 'react';
import { useSupabaseClient, useSession } from '@supabase/ssr';
import Link from 'next/link';

export default function DoctorDashboard() {
  const session = useSession();
  const supabase = useSupabaseClient();
  const [records, setRecords] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [summary, setSummary] = useState('');
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const { data: recs } = await supabase
        .from('records')
        .select('*, patient:patient_id(email)')
        .eq('doctor_id', session?.user.id);
      if (recs) setRecords(recs);

      const { data: appts } = await supabase
        .from('appointments')
        .select('patient:patient_id(id, email)')
        .eq('doctor_id', session?.user.id);
      if (appts) setPatients(appts.map((d) => d.patient));
    };
    if (session) loadData();
  }, [session]);

  const handleUpload = async () => {
    let file_url = null;
    if (file) {
      const path = `${session?.user.id}/${Date.now()}_${file.name}`;
      await supabase.storage.from('ehr-files').upload(path, file);
      file_url = supabase.storage.from('ehr-files').getPublicUrl(path).data.publicUrl;
    }
    await supabase.from('records').insert({
      doctor_id: session?.user.id,
      patient_id: selectedPatient,
      summary,
      file_url
    });
    alert('Record uploaded!');
  };

  return (
    <div>
      <h1>Welcome, Dr. {session?.user.email}</h1>
      <Link href="/dashboard/doctor-appointments">📅 View Appointments</Link>
      <h2>Upload New Record</h2>
      <select value={selectedPatient} onChange={(e) => setSelectedPatient(e.target.value)}>
        <option value="">Select Patient</option>
        {patients.map((p) => <option key={p.id} value={p.id}>{p.email}</option>)}
      </select>
      <br />
      <textarea value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Summary" />
      <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      <button onClick={handleUpload}>Submit</button>
    </div>
  );
}