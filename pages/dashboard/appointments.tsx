import { useEffect, useState } from 'react';
import { useSupabaseClient, useSession } from '@supabase/ssr';
import Link from 'next/link';

export default function Appointments() {
  const session = useSession();
  const supabase = useSupabaseClient();
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');

  useEffect(() => {
    const loadDoctors = async () => {
      const { data } = await supabase.from('profiles').select('id, email').eq('role', 'doctor');
      if (data) setDoctors(data);
    };
    loadDoctors();
  }, []);

  const handleAppointment = async () => {
    await supabase.from('appointments').insert({
      patient_id: session?.user.id,
      doctor_id: selectedDoctor,
      date: new Date(appointmentDate)
    });
    alert('Appointment booked!');
  };

  return (
    <div>
      <Link href="/dashboard/patient">⬅ Back</Link>
      <h1>Book Appointment</h1>
      <select value={selectedDoctor} onChange={(e) => setSelectedDoctor(e.target.value)}>
        <option value="">Select Doctor</option>
        {doctors.map((d) => <option key={d.id} value={d.id}>{d.email}</option>)}
      </select>
      <br />
      <input type="datetime-local" value={appointmentDate} onChange={(e) => setAppointmentDate(e.target.value)} />
      <br />
      <button onClick={handleAppointment}>Book</button>
    </div>
  );
}