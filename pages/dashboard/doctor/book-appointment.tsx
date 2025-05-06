import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link'; // Added for breadcrumbs or back links
import Head from 'next/head'; // Added for page title

// Interface for Patient details (optional, if you want to display patient name)
interface Patient {
  id: string;
  full_name?: string; // Assuming patient might have a full_name
  email?: string;
}

// Generate time slots for 9 AM to 2 PM in 30-minute intervals
const generateTimeSlots = () => {
  const slots: string[] = [];
  for (let hour = 9; hour < 14; hour++) {
    slots.push(hour.toString().padStart(2, '0') + ':00');
    slots.push(hour.toString().padStart(2, '0') + ':30');
  }
  slots.push('14:00');
  return slots;
};

export default function DoctorBookAppointmentPage() {
  const router = useRouter();
  const { patient_id } = router.query; // Get patient_id from URL

  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [loading, setLoading] = useState(true); // For loading patient/doctor data or booked slots
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [bookedAppointments, setBookedAppointments] = useState<string[]>([]);
  const [patientDetails, setPatientDetails] = useState<Patient | null>(null); // To store and display patient info
  const [loggedInDoctorId, setLoggedInDoctorId] = useState<string | null>(null);

  const supabase = createClientComponentClient();

  const timeSlots = useMemo(() => generateTimeSlots(), []);

  // Fetch logged-in doctor's ID and patient details
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session?.user) {
          throw new Error(sessionError?.message || 'You must be logged in to book appointments.');
        }
        if (session.user.user_metadata?.role !== 'doctor') {
          throw new Error('Access denied. Only doctors can book appointments here.');
        }
        setLoggedInDoctorId(session.user.id);

        if (patient_id && typeof patient_id === 'string') {
          const { data: patientData, error: patientError } = await supabase
            .from('profiles') // Assuming patient profiles are stored here
            .select('id, full_name, email')
            .eq('id', patient_id)
            .single();
          if (patientError) throw patientError;
          setPatientDetails(patientData);
        } else {
          throw new Error('Patient ID is missing or invalid.');
        }
      } catch (err: any) {
        console.error('Error fetching initial data:', err);
        setError(err.message || 'Failed to load necessary data.');
        // Optionally redirect if critical data is missing
        if (err.message.includes('Patient ID is missing')) {
            // router.push('/dashboard/doctor/my-patients'); // Example redirect
        }
      } finally {
        setLoading(false);
      }
    };
    if (router.isReady) { // Ensure router.query is populated
        fetchData();
    }
  }, [supabase, patient_id, router.isReady]);

  // Fetch booked appointments when doctor and date are selected
  useEffect(() => {
    const fetchBookedAppointments = async () => {
      if (!loggedInDoctorId || !selectedDate) return;
      setLoading(true);
      try {
        const { data, error: fetchError } = await supabase
          .from('appointments')
          .select('date')
          .eq('doctor_id', loggedInDoctorId)
          .gte('date', `${selectedDate}T00:00:00Z`)
          .lt('date', `${selectedDate}T23:59:59Z`);

        if (fetchError) throw fetchError;
        
        const bookedSlots = data.map(appt => {
          const localTime = new Date(appt.date);
          return localTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }).replace(' AM', '').replace(' PM', '');
        });
        setBookedAppointments(bookedSlots);
      } catch (err: any) {
        console.error('Error fetching booked appointments:', err);
        setError(err.message || 'Could not fetch booked appointments.');
      } finally {
        setLoading(false);
      }
    };

    if (loggedInDoctorId && selectedDate) {
      fetchBookedAppointments();
    }
  }, [loggedInDoctorId, selectedDate, supabase]);

  const availableTimeSlots = useMemo(() => {
    return timeSlots.filter(slot => !bookedAppointments.includes(slot));
  }, [timeSlots, bookedAppointments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient_id || typeof patient_id !== 'string' || !loggedInDoctorId) {
      setError("Patient or Doctor ID is missing. Cannot book appointment.");
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      // Create a date object in local time
      const appointmentDateTime = new Date(`${selectedDate}T${selectedTime}`);
      const utcDateTimeString = appointmentDateTime.toISOString(); // Store in UTC

      // Check for patient's existing upcoming appointments (optional, but good practice)
      const { data: existingPatientAppointments, error: checkPatientError } = await supabase
        .from('appointments')
        .select('id, date')
        .eq('patient_id', patient_id)
        .eq('status', 'upcoming');

      if (checkPatientError) {
        console.error('Error checking patient existing appointments:', checkPatientError);
        setError('Failed to verify patient appointment availability.');
        setSubmitting(false);
        return;
      }

      if (existingPatientAppointments && existingPatientAppointments.length > 0) {
        setError(
          `This patient already has an upcoming appointment on ${new Date(
            existingPatientAppointments[0].date
          ).toLocaleDateString()}. Please manage existing appointments first.`
        );
        setSubmitting(false);
        
        return;
      }
      
      // Check for doctor's existing appointment at the same slot
      const { data: existingDoctorAppointments, error: checkDoctorError } = await supabase
        .from('appointments')
        .select('id')
        .eq('doctor_id', loggedInDoctorId)
        .eq('date', utcDateTimeString) // Exact match for the chosen slot
        .eq('status', 'upcoming');

      if (checkDoctorError) {
        console.error('Error checking doctor existing appointments:', checkDoctorError);
        setError('Failed to verify doctor availability.');
        setSubmitting(false);
        return;
      }
      
      if (existingDoctorAppointments && existingDoctorAppointments.length > 0) {
          setError('You already have an appointment scheduled at this time. Please choose a different slot.');
          setSubmitting(false);
          return;
      }


      const { error: appointmentError, data: appointmentData } = await supabase
        .from('appointments')
        .insert({
          patient_id: patient_id,
          doctor_id: loggedInDoctorId,
          date: utcDateTimeString,
          reason: reason,
          status: 'upcoming',
          cancelled: false
        })
        .select(); // Important to get the inserted data back if needed

      if (appointmentError) {
        console.error('Appointment booking error:', appointmentError);
        setError(appointmentError.message || 'Failed to book appointment.');
        throw appointmentError;
      }
      
      console.log('Appointment booked successfully:', appointmentData);

      // Update records table
      // Check if a record already exists for this patient-doctor pair
      const { data: existingRecords, error: fetchRecordsError } = await supabase
        .from('records')
        .select('id')
        .eq('patient_id', patient_id)
        .eq('doctor_id', loggedInDoctorId)
        .limit(1);

      if (fetchRecordsError) {
        console.error('Error fetching existing records:', fetchRecordsError);
        // Decide if this is a critical error, for now, we'll log and continue
      }

      if (!existingRecords || existingRecords.length === 0) {
        const { error: recordsError, data: recordData } = await supabase
          .from('records')
          .insert({
            patient_id: patient_id,
            doctor_id: loggedInDoctorId,
            // Add any other relevant fields like 'last_appointment_id': appointmentData[0].id
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select();
        
        if (recordsError) {
          console.error('Error creating record:', recordsError);
          // setError('Appointment booked, but failed to update patient records.'); 
          // Not setting error here to let success message show, but log it.
        } else {
            console.log('Record created successfully:', recordData);
        }
      } else {
        // Optionally update the existing record's updated_at or other fields
        const { error: updateRecordError } = await supabase
            .from('records')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', existingRecords[0].id);
        if (updateRecordError) {
            console.error('Error updating record:', updateRecordError);
        } else {
            console.log('Record updated for new appointment activity.');
        }
      }
      
      alert('Appointment booked successfully!'); // Simple success feedback
      router.push('/dashboard/doctor'); // Redirect to patient list or confirmation page

    } catch (err: any) {
      console.error('Booking submission error:', err);
      setError(err.message || 'An unexpected error occurred during booking.');
    } finally {
      setSubmitting(false);
    }
  };
  
  if (!router.isReady || loading) { // Wait for router and initial data load
    return (
        <div className="min-h-screen flex items-center justify-center">
            <p>Loading appointment booking page...</p>
        </div>
    );
  }

  if (error && !patientDetails) { // Critical error like missing patient ID or access denied
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                <strong className="font-bold">Error: </strong>
                <span className="block sm:inline">{error}</span>
            </div>
            <Link href="/dashboard/doctor" className="text-indigo-600 hover:underline">
                Return to Dashboard
            </Link>
        </div>
    );
  }


  return (
    <>
      <Head>
        <title>Book Appointment - Doctor Dashboard</title>
      </Head>
      <div className="min-h-screen bg-gray-100 p-4 sm:p-8">
        <header className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Book New Appointment</h1>
            {patientDetails && (
                <p className="text-lg text-gray-600">
                    For Patient: {patientDetails.full_name || patientDetails.email || patient_id}
                </p>
            )}
             <Link href="/dashboard/doctor" className="text-sm text-indigo-600 hover:underline">
                &larr; Back to Dashboard
            </Link>
        </header>

        <main className="bg-white shadow-xl rounded-lg p-6 sm:p-8 max-w-2xl mx-auto">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
              <div className="flex justify-between items-start">
                <div>
                  <strong className="font-bold">Booking Error: </strong>
                  <span className="block sm:inline">{error}</span>
                </div>
                <button 
                  onClick={() => setError(null)} 
                  className="text-red-700 hover:text-red-900 font-bold ml-2 text-xl leading-none"
                  aria-label="Close error"
                >
                  &times;
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="appointmentDate" className="block text-sm font-medium text-gray-700 mb-1">
                Appointment Date
              </label>
              <input
                id="appointmentDate"
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setSelectedTime(''); // Reset time when date changes
                }}
                className="w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
                min={new Date().toISOString().split('T')[0]} // Prevent booking past dates
              />
            </div>

            <div>
              <label htmlFor="appointmentTime" className="block text-sm font-medium text-gray-700 mb-1">
                Appointment Time
              </label>
              <select
                id="appointmentTime"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
                disabled={!selectedDate || availableTimeSlots.length === 0}
              >
                <option value="">Select a time slot</option>
                {availableTimeSlots.map(slot => (
                  <option key={slot} value={slot}>{slot}</option>
                ))}
              </select>
              {selectedDate && availableTimeSlots.length === 0 && !loading && (
                <p className="text-red-500 text-xs mt-1">No available time slots for this date.</p>
              )}
               {selectedDate && bookedAppointments.length > 0 && !loading && (
                 <p className="text-xs text-gray-500 mt-1">
                    Note: Some time slots may be unavailable due to existing bookings.
                 </p>
               )}
            </div>

            <div>
              <label htmlFor="reasonForVisit" className="block text-sm font-medium text-gray-700 mb-1">
                Reason for Visit
              </label>
              <textarea
                id="reasonForVisit"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                className="w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter reason for the appointment (e.g., Follow-up, New concern)"
                required
              />
            </div>

            <button 
              type="submit" 
              disabled={submitting || !selectedDate || !selectedTime || !reason}
              className="w-full bg-indigo-600 text-white py-2.5 px-4 rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Booking Appointment...' : 'Confirm Booking'}
            </button>
          </form>
        </main>
      </div>
    </>
  );
}
