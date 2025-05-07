import React, { useState, useEffect, useMemo } from 'react';
import BookAppointmentModal from './BookAppointmentModal';
import DoctorDetailsModal from './DoctorDetailsModal';
import AppointmentDetailsModal from './AppointmentDetailsModal';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  date: string;
  appointment_time: string;
  status: 'upcoming' | 'completed' | 'cancelled';
  reason: string;
  created_at: string;
  doctor_name: string;
}

const PAGE_SIZE = 5;

const AppointmentsTab: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'completed' | 'cancelled'>('upcoming');
  const [doctorModal, setDoctorModal] = useState<{open: boolean, doctor: any}>({open: false, doctor: null});
  const [detailsModal, setDetailsModal] = useState<{open: boolean, appointment: any}>({open: false, appointment: null});
  const [rescheduleModal, setRescheduleModal] = useState<{open: boolean, appointment: Appointment}>({open: false, appointment: {} as Appointment});
  const supabase = createClientComponentClient();

  // Generate date constraints for weekday appointments
  const getAppointmentDateConstraints = () => {
    const today = new Date();
    const minDate = new Date(today);
    const maxDate = new Date(today);

    // Set minimum date to today or next Monday if today is weekend
    while (minDate.getDay() === 0 || minDate.getDay() === 6) {
      minDate.setDate(minDate.getDate() + 1);
    }

    // Set maximum date to 3 months from now, ending on a Friday
    maxDate.setMonth(maxDate.getMonth() + 3);
    while (maxDate.getDay() !== 5) {
      maxDate.setDate(maxDate.getDate() - 1);
    }

    // Format dates consistently
    const formatDate = (date: Date) => 
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

    return {
      min: formatDate(minDate),
      max: formatDate(maxDate)
    };
  };

  const { min: rescheduleMinDate, max: rescheduleMaxDate } = getAppointmentDateConstraints();
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState<string | null>(null);

  const generateTimeSlots = () => {
    const slots: string[] = [];
    for (let hour = 9; hour < 14; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      slots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
    slots.push('14:00');
    return slots;
  };

  const timeSlots = useMemo(() => generateTimeSlots(), []);

  const [bookedAppointments, setBookedAppointments] = useState<string[]>([]);

  useEffect(() => {
    const fetchBookedAppointments = async () => {
      if (!rescheduleModal.appointment.doctor_id || !rescheduleDate) return;

      try {
        const { data, error } = await supabase
          .from('appointments')
          .select('date')
          .eq('doctor_id', rescheduleModal.appointment.doctor_id)
          .gte('date', `${rescheduleDate}T00:00:00`)
          .lt('date', `${rescheduleDate}T23:59:59`);

        if (error) throw error;

        // Extract booked time slots
        const bookedSlots = data.map(appt => {
          // Parse the date in local time
          const localDate = new Date(appt.date);
          const time = localDate.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit', 
            hour12: true,
            timeZone: 'UTC' // Ensure consistent timezone
          });
          return time;
        });

        setBookedAppointments(bookedSlots);
      } catch (err) {
        console.error('Error fetching booked appointments:', err);
      }
    };

    fetchBookedAppointments();
  }, [rescheduleModal.appointment.doctor_id, rescheduleDate, supabase]);

  const availableTimeSlots = useMemo(() => {
    return timeSlots.filter(slot => !bookedAppointments.includes(slot));
  }, [timeSlots, bookedAppointments]);

  const fetchAppointments = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      // Fetch appointments with doctor details
      const { data, error: appointmentsError } = await supabase
        .from('appointments')
        .select(`
          *,
          doctor:profiles!fk_appointments_doctor(full_name, email)
        `)
        .eq('patient_id', session.user.id)
        .order('date', { ascending: true });

      if (appointmentsError) {
        console.error('Appointments query error:', appointmentsError);
        setError('Failed to fetch appointments');
        return;
      }

      // Transform appointments to include doctor name
      const appointmentsWithDoctorInfo = data.map((appointment: any) => ({
        ...appointment,
        doctor_name: appointment.doctor?.full_name || 'Unknown Doctor'
      }));

      setAppointments(appointmentsWithDoctorInfo);
    } catch (err) {
      console.error('Error fetching appointments:', err);
      setError('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [supabase]);

  // Status calculation
  const getStatus = (appt: Appointment) => {
    if (appt.status === 'cancelled') return 'Cancelled';
    const now = new Date();
    const apptDate = new Date(appt.date);
    if (apptDate > now) return 'Upcoming';
    return 'Completed';
  };

  // Filtering
  const filteredAppointments = appointments.filter(appointment => {
    if (filter === 'all') return true;
    return appointment.status === filter;
  });

  // Pagination
  const totalPages = Math.ceil(filteredAppointments.length / PAGE_SIZE);
  const paginated = filteredAppointments.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Cancel logic
  const handleCancel = async (id: string) => {
    setLoading(true);
    const { error } = await supabase
      .from('appointments')
      .update({ 
        status: 'cancelled', 
        cancelled: true 
      })
      .eq('id', id);
    
    if (!error) {
      await fetchAppointments();
    }
    setLoading(false);
  };

  // Reschedule logic
  const handleReschedule = async (id: string, newDate: string, newTime: string) => {
    setRescheduleLoading(true);
    try {
      // Create a date object in local time
      const appointmentDateTime = new Date(`${newDate}T${newTime}`);
      
      // Convert to ISO string to store in UTC
      const utcDateTimeString = appointmentDateTime.toISOString();

      const { error } = await supabase
        .from('appointments')
        .update({ date: utcDateTimeString })
        .eq('id', id);
      
      if (error) throw error;

      await fetchAppointments();
      
      // Reset reschedule modal and show success
      setRescheduleModal({open: false, appointment: {} as Appointment});
      setRescheduleDate('');
      setRescheduleTime('');
    } catch (err) {
      console.error('Reschedule error:', err);
      // Optionally set an error state to show to user
    } finally {
      setRescheduleLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Appointments</h2>
        <p>Loading appointments...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Appointments</h2>
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <BookAppointmentModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        onSuccess={fetchAppointments} 
      />
      <DoctorDetailsModal 
        open={doctorModal.open} 
        onClose={() => setDoctorModal({open: false, doctor: null})} 
        doctor={doctorModal.doctor} 
      />
      <AppointmentDetailsModal 
        open={detailsModal.open} 
        onClose={() => setDetailsModal({open: false, appointment: null})} 
        appointment={detailsModal.appointment} 
      />
      {/* Reschedule Modal */}
      {rescheduleModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md relative">
            <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-600" onClick={() => setRescheduleModal({open: false, appointment: {} as Appointment})}>&times;</button>
            <h2 className="text-2xl font-bold mb-4">Reschedule Appointment</h2>
            <input
                type="date"
                value={rescheduleDate}
                onChange={(e) => {
                  const selectedDate = e.target.value;
                  setRescheduleDate(selectedDate);
                  setRescheduleTime(''); // Reset time when date changes
                }}
                className="w-full border rounded px-3 py-2"
                required
                min={rescheduleMinDate}
                max={rescheduleMaxDate}
              />
            <select
              value={rescheduleTime}
              onChange={(e) => setRescheduleTime(e.target.value)}
              className="w-full border rounded px-3 py-2 mt-2"
            >
              <option value="">Select a time slot</option>
              {availableTimeSlots.map(slot => (
                <option key={slot} value={slot}>{slot}</option>
              ))}
            </select>
            <button
              className="w-full py-2 bg-indigo-500 text-white font-bold rounded hover:bg-indigo-600 transition"
              onClick={() => handleReschedule(rescheduleModal.appointment.id, rescheduleDate, rescheduleTime)}
              disabled={rescheduleLoading || !rescheduleTime}
            >
              {rescheduleLoading ? 'Rescheduling...' : 'Confirm Reschedule'}
            </button>
          </div>
        </div>
      )}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Appointments</h2>
        <button
          className="bg-indigo-500 text-white px-4 py-2 rounded font-semibold hover:bg-indigo-600 transition"
          onClick={() => setModalOpen(true)}
        >
          Book Appointment
        </button>
      </div>
      {/* Filter */}
      <div className="mb-4 flex items-center gap-4">
        <label className="font-semibold">Filter:</label>
        <select
          className="border px-2 py-1 rounded"
          value={filter}
          onChange={e => { setFilter(e.target.value as any); setCurrentPage(1); }}
        >
          <option value="all">All</option>
          <option value="upcoming">Upcoming</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
      <div className="bg-white rounded shadow p-4">
        <h3 className="font-semibold mb-2">Appointment History</h3>
        {loading ? (
          <div className="text-gray-500">Loading...</div>
        ) : error ? (
          <div className="text-red-500">{error}</div>
        ) : paginated.length === 0 ? (
          <div className="text-gray-500 text-center py-8">No patient appointment booking history</div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr>
                <th className="py-2">Doctor</th>
                <th className="py-2">Date</th>
                <th className="py-2">Status</th>
                <th className="py-2">Reason</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map(appt => {
                const status = getStatus(appt);
                return (
                  <tr key={appt.id} className="border-t hover:bg-gray-50 cursor-pointer" onClick={e => {
                    // Only open details modal if not clicking a button
                    if ((e.target as HTMLElement).tagName !== 'BUTTON')
                      setDetailsModal({open: true, appointment: {...appt, status}});
                  }}>
                    <td className="py-2 text-indigo-600 underline cursor-pointer" onClick={e => { e.stopPropagation(); setDoctorModal({open: true, doctor: { name: appt.doctor_name }}); }}>{appt.doctor_name}</td>
                    <td className="py-2">{new Date(appt.date).toLocaleString()}</td>
                    <td className="py-2">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${status === 'Upcoming' ? 'bg-blue-100 text-blue-700' : status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{status}</span>
                    </td>
                    <td className="py-2">{appt.reason}</td>
                    <td className="py-2 flex gap-2">
                      {status === 'Upcoming' && !appt.status.includes('cancelled') && (
                        <>
                          <button
                            className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-semibold hover:bg-yellow-200"
                            onClick={e => { 
                              e.stopPropagation(); 
                              setRescheduleModal({open: true, appointment: appt}); 
                              setRescheduleDate(''); 
                              setRescheduleTime(''); 
                            }}
                          >Reschedule</button>
                          <button
                            className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-semibold hover:bg-red-200"
                            onClick={e => { e.stopPropagation(); handleCancel(appt.id); }}
                            disabled={cancelLoading === appt.id}
                          >{cancelLoading === appt.id ? 'Cancelling...' : 'Cancel'}</button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-4 gap-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                className={`px-3 py-1 rounded ${page === currentPage ? 'bg-indigo-500 text-white' : 'bg-gray-200 text-gray-700'}`}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AppointmentsTab; 