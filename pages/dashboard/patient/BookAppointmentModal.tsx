import React, { useState, useEffect, useMemo } from 'react';
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

// Generate time slots for 9 AM to 2 PM in 30-minute intervals
const generateTimeSlots = () => {
  const slots: string[] = [];
  for (let hour = 9; hour < 14; hour++) {
    slots.push(`${hour.toString().padStart(2, '0')}:00`);
    slots.push(`${hour.toString().padStart(2, '0')}:30`);
  }
  slots.push('14:00');
  return slots;
};

export default function BookAppointmentModal({ isOpen, onClose, onSuccess }: BookAppointmentModalProps) {
  const [selectedDoctor, setSelectedDoctor] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [bookedAppointments, setBookedAppointments] = useState<string[]>([]);
  const supabase = createClientComponentClient();

  // Generate time slots
  const timeSlots = useMemo(() => generateTimeSlots(), []);

  // Fetch doctors
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const { data, error: doctorsError } = await supabase
          .rpc('get_doctors');

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

  // Fetch booked appointments when doctor and date are selected
  useEffect(() => {
    const fetchBookedAppointments = async () => {
      if (!selectedDoctor || !selectedDate) return;

      try {
        const { data, error } = await supabase
          .from('appointments')
          .select('date')
          .eq('doctor_id', selectedDoctor)
          .gte('date', `${selectedDate}T00:00:00Z`)
          .lt('date', `${selectedDate}T23:59:59Z`);

        if (error) throw error;

        // Extract booked time slots
        const bookedSlots = data.map(appt => {
          const time = new Date(appt.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
          return time;
        });

        setBookedAppointments(bookedSlots);
      } catch (err) {
        console.error('Error fetching booked appointments:', err);
      }
    };

    fetchBookedAppointments();
  }, [selectedDoctor, selectedDate, supabase]);

  // Filter available time slots
  const availableTimeSlots = useMemo(() => {
    return timeSlots.filter(slot => !bookedAppointments.includes(slot));
  }, [timeSlots, bookedAppointments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setError('Please log in to book an appointment');
        return;
      }

      // Create a date object in local time
      const appointmentDateTime = new Date(`${selectedDate}T${selectedTime}`);
      
      // Convert to ISO string to store in UTC
      const utcDateTimeString = appointmentDateTime.toISOString();

      const { error } = await supabase
        .from('appointments')
        .insert({
          patient_id: session.user.id,
          doctor_id: selectedDoctor,
          date: utcDateTimeString,
          reason: reason,
          status: 'scheduled'
        });

      if (error) throw error;

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Booking error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
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
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setSelectedTime(''); // Reset time when date changes
                }}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Appointment Time
              </label>
              <select
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="w-full border rounded px-3 py-2"
                required
                disabled={!selectedDoctor || !selectedDate}
              >
                <option value="">Select a time slot</option>
                {availableTimeSlots.map(slot => (
                  <option key={slot} value={slot}>{slot}</option>
                ))}
              </select>
              {selectedDoctor && selectedDate && availableTimeSlots.length === 0 && (
                <p className="text-red-500 text-sm mt-1">No available time slots for this date</p>
              )}
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