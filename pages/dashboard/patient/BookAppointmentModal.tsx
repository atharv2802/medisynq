import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface Doctor {
  id: string;
  full_name: string;
  email: string;
}

interface BookAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BookAppointmentModal({ isOpen, onClose, onSuccess }: BookAppointmentModalProps) {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<string>('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const { data, error: doctorsError } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .eq('role', 'doctor');

        if (doctorsError) throw doctorsError;

        setDoctors(data || []);
      } catch (err) {
        console.error('Error fetching doctors:', err);
        setError('Failed to load doctors');
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      fetchDoctors();
    }
  }, [isOpen, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctor || !appointmentDate || !appointmentTime || !reason) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('Not authenticated');
      }

      const { error: appointmentError } = await supabase
        .from('appointments')
        .insert({
          patient_id: session.user.id,
          doctor_id: selectedDoctor,
          appointment_date: appointmentDate,
          appointment_time: appointmentTime,
          reason: reason,
          status: 'pending'
        });

      if (appointmentError) throw appointmentError;

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error creating appointment:', err);
      setError('Failed to book appointment');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold mb-4">Book Appointment</h2>
        
        {loading ? (
          <p>Loading doctors...</p>
        ) : error ? (
          <p className="text-red-500">{error}</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Doctor
              </label>
              <select
                value={selectedDoctor}
                onChange={(e) => setSelectedDoctor(e.target.value)}
                className="w-full border rounded px-3 py-2"
                required
              >
                <option value="">Choose a doctor</option>
                {doctors.map(doctor => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Appointment Date
              </label>
              <input
                type="date"
                value={appointmentDate}
                onChange={(e) => setAppointmentDate(e.target.value)}
                className="w-full border rounded px-3 py-2"
                required
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Appointment Time
              </label>
              <input
                type="time"
                value={appointmentTime}
                onChange={(e) => setAppointmentTime(e.target.value)}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason for Visit
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full border rounded px-3 py-2"
                rows={3}
                required
              />
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 border rounded hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 disabled:opacity-50"
              >
                {submitting ? 'Booking...' : 'Book Appointment'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
} 