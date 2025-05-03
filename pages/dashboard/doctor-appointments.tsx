import { useEffect, useState } from 'react';
import { useSupabaseClient, useSession } from '@supabase/ssr';
import Link from 'next/link';

export default function DoctorAppointments() {
  const supabase = useSupabaseClient();
  const session = useSession();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [newDate, setNewDate] = useState('');

  useEffect(() => {
    const fetchAppointments = async () => {
      const { data } = await supabase
        .from('appointments')
        .select('id, date, patient:patient_id(email)')
        .eq('doctor_id', session?.user.id);
      if (data) setAppointments(data);
    };
    if (session) fetchAppointments();
  }, [session]);

  const cancel = async (id: string) => {
    await supabase.from('appointments').delete().eq('id', id);
    setAppointments((prev) => prev.filter((a) => a.id !== id));
  };

  const reschedule = async () => {
    await supabase.from('appointments').update({ date: new Date(newDate) }).eq('id', rescheduleId);
    setRescheduleId(null);
    setNewDate('');
    location.reload();
  };

  return (
    <div>
      <Link href="/dashboard/doctor">⬅ Back</Link>
      <h1>Your Appointments</h1>
      <ul>
        {appointments.map((appt) => (
          <li key={appt.id}>
            Patient: {appt.patient.email}<br />
            Date: {new Date(appt.date).toLocaleString()}<br />
            <button onClick={() => cancel(appt.id)}>Cancel</button>
            <button onClick={() => setRescheduleId(appt.id)}>Reschedule</button>
          </li>
        ))}
      </ul>

      {rescheduleId && (
        <div>
          <h3>Reschedule</h3>
          <input type="datetime-local" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
          <button onClick={reschedule}>Update</button>
        </div>
      )}
    </div>
  );
}