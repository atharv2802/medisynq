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

      // Check for any existing upcoming appointments for the patient
      const { data: existingUpcomingAppointments, error: checkError } = await supabase
        .from('appointments')
        .select('id, date')
        .eq('patient_id', session.user.id)
        .eq('status', 'upcoming');

      if (checkError) {
        console.error('Error checking existing appointments:', checkError);
        setError('Failed to verify appointment availability');
        return;
      }

      if (existingUpcomingAppointments && existingUpcomingAppointments.length > 0) {
        // Create a modal-like error message
        setError(`You already have an upcoming appointment on ${new Date(existingUpcomingAppointments[0].date).toLocaleDateString()}. 
        
Please cancel or reschedule your existing appointment before booking a new one.`);
        return;
      }

      const { error } = await supabase
        .from('appointments')
        .insert({
          patient_id: session.user.id,
          doctor_id: selectedDoctor,
          date: utcDateTimeString,
          reason: reason,
          status: 'upcoming',
          cancelled: false
        });

      if (error) {
        console.error('Appointment booking error:', error);
        setError(error.message || 'Failed to book appointment');
        throw error;
      }

      // Update records table with the doctor ID from the booked appointment
      console.log('Updating records for patient:', session.user.id);
      console.log('Selected doctor:', selectedDoctor);

      // Verify user session
      if (!session?.user) {
        console.error('No active session');
        setError('Authentication failed');
        return;
      }

      console.log('Current user session:', {
        user: session.user.id,
        email: session.user.email
      });

      // Fetch existing records to check current state
      const { data: existingRecords, error: fetchError } = await supabase
        .from('records')
        .select('id, doctor_id, patient_id')
        .eq('patient_id', session.user.id);

      if (fetchError) {
        console.error('Error fetching records:', {
          message: fetchError.message,
          details: fetchError.details,
          hint: fetchError.hint
        });
        setError('Failed to fetch existing records');
        return;
      }

      // Detailed logging of existing records and patient information
      console.log('Patient User ID:', session.user.id);
      console.log('Selected Doctor ID:', selectedDoctor);
      console.log('Existing Records Count:', existingRecords.length);
      console.log('Existing Records Details:', JSON.stringify(existingRecords, null, 2));

      // If no records exist, create a new record
      if (!existingRecords || existingRecords.length === 0) {
        const { error: insertError, data: insertedRecord } = await supabase
          .from('records')
          .insert({
            patient_id: session.user.id,
            doctor_id: selectedDoctor,
            created_at: new Date().toISOString()
          })
          .select();

        if (insertError) {
          console.error('Error inserting new record:', {
            message: insertError.message,
            details: insertError.details,
            hint: insertError.hint
          });
          setError(`Failed to create new record: ${insertError.message}`);
        } else {
          console.log('Inserted new record:', JSON.stringify(insertedRecord, null, 2));
        }
        return;
      }

      // Define a type for update results to handle skipped updates
      type UpdateResult = {
        error?: any;
        data?: any[] | null;
        count?: number | null;
        status?: number;
        statusText?: string;
        skipReason?: string;
      };

      // Prepare batch update for records
      const updatePromises = existingRecords.map(record => {
        console.log('Record update details:', {
          recordId: record.id,
          currentDoctorId: record.doctor_id,
          patientId: record.patient_id,
          selectedDoctor: selectedDoctor
        });

        return supabase
          .from('records')
          .update({ 
            doctor_id: selectedDoctor,
            updated_at: new Date().toISOString() 
          })
          .eq('id', record.id)
          .select();
      });

      // Execute all updates
      const updateResults = await Promise.all(updatePromises);

      // Check and log results
      const successfulUpdates = updateResults.filter((result: UpdateResult) => !result.error);
      const errors = updateResults.filter((result: UpdateResult) => result.error);

      if (errors.length > 0) {
        console.error('Update errors:', errors);
        setError(`Failed to update ${errors.length} records`);
      }

      console.log('Successful updates:', JSON.stringify(successfulUpdates, null, 2));

      if (successfulUpdates.length === 0) {
        console.warn('No records were updated. Possible reasons:', {
          'Patient ID Match': 'Verify patient_id exists',
          'Table Permissions': 'Check Supabase RLS policies'
        });
      }

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
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Book Appointment</h2>
          <button 
            onClick={onClose} 
            className="text-gray-600 hover:text-gray-900 font-bold text-xl"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        
        {loading ? (
          <p>Loading doctors...</p>
        ) : error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <div className="flex justify-between items-center">
              <div>
                <strong className="font-bold">Appointment Booking Error</strong>
                <span className="block sm:inline ml-2">{error}</span>
              </div>
              <button 
                onClick={() => setError(null)} 
                className="text-red-700 hover:text-red-900 font-bold ml-4"
              >
                ✕
              </button>
            </div>
          </div>
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
                placeholder="Enter reason for your appointment"
                required
              />
            </div>

            <button 
              type="submit" 
              disabled={submitting}
              className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {submitting ? 'Booking...' : 'Book Appointment'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};