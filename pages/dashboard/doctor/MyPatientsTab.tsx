import React, { useState, useEffect, Fragment} from 'react';
import { Dialog, Transition } from '@headlessui/react';
import Link from 'next/link';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { FaUserMd, FaUserInjured, FaCalendarAlt, FaHeartbeat, FaTimes } from 'react-icons/fa';
import router from 'next/router';

interface Appointment {
  id: string;
  date: string;
  reason: string;
  status: 'completed' | 'cancelled' | 'upcoming';
  comments?: string;
}

interface Record {
  id: string;
}

interface Patient {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  dob?: string;
  gender?: string;
  appointments: Appointment[];
  records: Record[];
  medical_records_count: number;
}

const MyPatientsTab = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setLoading(false);
          return;
        }

        // First, verify user's role and permissions
        const { data: userProfileData, error: userProfileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        console.log('User profile:', JSON.stringify(userProfileData, null, 2));
        
        if (userProfileError || !userProfileData || userProfileData.role !== 'doctor') {
          console.error('User is not authorized as a doctor', userProfileError);
          setLoading(false);
          return;
        }

        // Get patient IDs for this doctor's appointments with full details
        const { data: appointmentsData, error: appointmentsError } = await supabase
          .from('appointments')
          .select('patient_id, patient:profiles!fk_appointments_patient(id, full_name, role, email, phone, dob, gender)')
          .eq('doctor_id', user.id)
          .in('status', ['upcoming', 'completed']) // Get upcoming and completed appointments
          .eq('cancelled', false); // Exclude cancelled appointments

        console.log('Full appointments data:', JSON.stringify(appointmentsData, null, 2));

        // Validate appointments data
        if (appointmentsError) {
          console.error('Error fetching appointments:', appointmentsError);
          setLoading(false);
          return;
        }

        // Get unique patient IDs
        const uniquePatientIds = Array.from(new Set(appointmentsData?.map(appt => appt.patient_id).filter(Boolean) || []));

        console.log('Unique patient IDs found:', uniquePatientIds.length);
        console.log('Patient IDs:', uniquePatientIds);

        if (appointmentsError) throw appointmentsError;

        // Log additional context before querying
        console.log('Querying with context:', {
          uniquePatientIds,
          userDetails: {
            id: user.id,
            email: user.email
          }
        });

        // Fetch patient details for each patient ID
        const { data: patientsData, error: patientsError } = await supabase
          .from('profiles')
          .select(`
            id, 
            full_name, 
            email, 
            phone, 
            dob, 
            gender,
            role,
            appointments:appointments!fk_appointments_patient(
              id, 
              date, 
              reason, 
              status, 
              comments,
              doctor_id
            ),
            records:records!fk_records_patient(id)
          `)
          .in('id', uniquePatientIds)
          .eq('role', 'patient')
          .eq('appointments.doctor_id', user.id);

        console.log('Patients query details:', {
          patientsData: JSON.stringify(patientsData, null, 2),
          error: patientsError
        });

        // Additional debugging if no patients found
        if (!patientsData || patientsData.length === 0) {
          // Check all profiles
          const { data: allProfiles, error: allProfilesError } = await supabase
            .from('profiles')
            .select('id, full_name, role')
            .in('id', uniquePatientIds);

          console.log('All matching profiles:', {
            profiles: JSON.stringify(allProfiles, null, 2),
            error: allProfilesError
          });
        }

        if (patientsError) throw patientsError;

        // Process patients
        const patientsWithDetails: Patient[] = (patientsData || []).map(patient => ({
          id: patient.id,
          full_name: patient.full_name || 'Unknown Patient',
          email: patient.email || '',
          phone: patient.phone || '',
          dob: patient.dob || '',
          gender: patient.gender || '',
          appointments: patient.appointments || [],
          records: patient.records || [],
          medical_records_count: patient.records?.length || 0
        }));

        // Set patients directly from processed data
        setPatients(patientsWithDetails);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching patients:', error);
        setLoading(false);
      }
    };

    fetchPatients();
  }, [supabase]);

  const openPatientDetails = (patient: Patient) => {
    setSelectedPatient(patient);
    setIsPatientModalOpen(true);
  };

  const closePatientDetails = () => {
    setSelectedPatient(null);
    setIsPatientModalOpen(false);
  };

  const handleMedicalRecordsClick = (patient: Patient) => {
    localStorage.setItem('selectedPatient', JSON.stringify(patient));
    router.push(`/dashboard/doctor/medical-records?patient_id=${patient.id}`);
  };

  const closePatientModal = () => {
    setIsPatientModalOpen(false);
    setSelectedPatient(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {patients.map((patient) => (
          <div 
            key={patient.id} 
            className="bg-white shadow-md rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer group"
            onClick={() => openPatientDetails(patient)}
          >
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                <FaUserInjured className="text-3xl text-blue-500 group-hover:text-blue-600 transition" />
              </div>
              <div className="flex-grow">
                <h3 className="text-xl font-bold text-gray-800 group-hover:text-blue-600 transition">{patient.full_name}</h3>
                <div className="flex items-center space-x-2 text-gray-600">
                  <FaHeartbeat className="text-sm" />
                  <span className="text-sm">{patient.appointments.length} Appointments</span>
                  <div className="flex space-x-1">
                    {patient.appointments.some(appt => appt.status === 'upcoming') && (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">Upcoming</span>
                    )}
                    {patient.appointments.some(appt => appt.status === 'completed') && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Completed</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm text-gray-500">View Details</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Patient Details Modal */}
      <Transition show={isPatientModalOpen} as={Fragment}>
  <Dialog onClose={closePatientModal} className="fixed inset-0 z-10 overflow-y-auto">
    <div className="flex min-h-screen items-center justify-center px-4 text-center">
      <Transition.Child
        as="div"
        enter="ease-out duration-300"
        enterFrom="opacity-0 scale-95"
        enterTo="opacity-100 scale-100"
        leave="ease-in duration-200"
        leaveFrom="opacity-100 scale-100"
        leaveTo="opacity-0 scale-95"
        className="inline-block w-full max-w-2xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg relative"
      >
        {selectedPatient && (
          <>
            <button 
              onClick={closePatientDetails}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 focus:outline-none bg-red-100 hover:bg-red-200 p-2 rounded-full transition-colors duration-200 z-10"
            >
              <FaTimes className="text-2xl text-red-600" />
            </button>

            <div className="mb-4">
              <h2 className="text-2xl font-bold text-gray-800 pr-10">{selectedPatient.full_name}</h2>
              <div className="border-b border-gray-200 my-4"></div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className="text-sm break-words">
                <h4 className="font-semibold mb-1">Personal Information</h4>
                <p>Email: {selectedPatient.email}</p>
                <p>Phone: {selectedPatient.phone || 'N/A'}</p>
                <p>Date of Birth: {selectedPatient.dob || 'N/A'}</p>
                <p>Gender: {selectedPatient.gender || 'N/A'}</p>
              </div>

              <div className="text-sm">
                <h4 className="font-semibold mb-1">Medical Overview</h4>
                <p>Total Appointments: {selectedPatient.appointments?.length || 0}</p>
                <p>Medical Records: {selectedPatient.records?.length || 0}</p>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="font-semibold mb-2">Appointment History</h4>
              {selectedPatient.appointments.filter(appt => appt.status !== 'cancelled').length > 0 ? (
                <div className="space-y-2">
                  {selectedPatient.appointments
                    .filter(appt => appt.status !== 'cancelled')
                    .map((appt) => (
                      <div 
                        key={appt.id} 
                        className={`p-2 rounded text-sm ${appt.status === 'completed' ? 'bg-green-100' : appt.status === 'upcoming' ? 'bg-yellow-100' : 'bg-red-100'}`}
                      >
                        <p>{new Date(appt.date).toLocaleString()}</p>
                        <p>Reason: {appt.reason}</p>
                        <p>Status: {appt.status}</p>
                      </div>
                    ))}
                </div>
              ) : (
                <p>No appointment history</p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 mt-4">
              <Link 
                href={`/dashboard/doctor/book-appointment?patient_id=${selectedPatient.id}`}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition text-center"
              >
                Book Appointment
              </Link>
              <button
                onClick={() => handleMedicalRecordsClick(selectedPatient)}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition text-center"
              >
                Medical Records
              </button>
            </div>
          </>
        )}
      </Transition.Child>
    </div>
  </Dialog>
</Transition>
    </div>
  );
}

export default MyPatientsTab;