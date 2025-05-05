import React, { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import Link from 'next/link';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { FaUserMd, FaUserInjured, FaCalendarAlt, FaHeartbeat } from 'react-icons/fa';

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

const MyPatientsTab: React.FC = () => {
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
      <Transition show={isPatientModalOpen} as={React.Fragment}>
        <Dialog onClose={closePatientModal} className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center">
            <div className="fixed inset-0 bg-black opacity-30" />
            
            <div className="relative bg-white rounded-lg max-w-2xl w-full p-6 mx-auto">
              {selectedPatient && (
                <div>
                  <Dialog.Title className="text-2xl font-bold mb-4">{selectedPatient.full_name}</Dialog.Title>
                  
                  {/* Patient Details Section */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                      <h4 className="font-semibold">Personal Information</h4>
                      <p>Email: {selectedPatient.email}</p>
                      <p>Phone: {selectedPatient.phone || 'N/A'}</p>
                      <p>Date of Birth: {selectedPatient.dob || 'N/A'}</p>
                      <p>Gender: {selectedPatient.gender || 'N/A'}</p>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold">Medical Overview</h4>
                      <p>Total Appointments: {selectedPatient.appointments?.length || 0}</p>
                      <p>Medical Records: {selectedPatient.records?.length || 0}</p>
                    </div>
                  </div>

                  {/* Appointment History */}
                  <div className="mb-6">
                    <h4 className="font-semibold mb-2">Appointment History</h4>
                    {selectedPatient.appointments?.length ? (
                      <div className="space-y-2">
                        {selectedPatient.appointments.map((appt) => (
                          <div 
                            key={appt.id} 
                            className={`p-2 rounded ${appt.status === 'completed' ? 'bg-green-100' : appt.status === 'cancelled' ? 'bg-red-100' : 'bg-yellow-100'}`}
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

                  {/* Action Buttons */}
                  <div className="flex space-x-4">
                    <Link 
                      href={`/dashboard/doctor/book-appointment?patient_id=${selectedPatient.id}`}
                      className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
                    >
                      Book Appointment
                    </Link>
                    <Link 
                      href={`/dashboard/doctor/medical-records?patient_id=${selectedPatient.id}`}
                      className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition"
                    >
                      Medical Records
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );

  return (
    <div className="patients-tab p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">My Patients</h2>

      {patients.length === 0 ? (
        <div className="bg-white shadow-md rounded-lg p-8 text-center">
          <FaUserInjured className="mx-auto text-6xl text-gray-300 mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No Patients Found</h3>
          <p className="text-gray-500">
            You currently have no patients assigned to you. 
            Patients will appear here once they are added to your care.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {patients.map((patient) => (
            <div 
              key={patient.id} 
              className="bg-white shadow-md rounded-lg p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center mb-4">
                <FaUserMd className="text-3xl text-blue-500 mr-4" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">{patient.full_name}</h3>
                  <p className="text-sm text-gray-500">{patient.email}</p>
                </div>
              </div>
              <div className="space-y-2">
                {patient.dob && (
                  <div className="flex items-center text-sm text-gray-600">
                    <FaCalendarAlt className="mr-2 text-gray-400" />
                    <span>DOB: {patient.dob}</span>
                  </div>
                )}
                {patient.gender && (
                  <div className="flex items-center text-sm text-gray-600">
                    <FaUserMd className="mr-2 text-gray-400" />
                    <span>Gender: {patient.gender}</span>
                  </div>
                )}
                {patient.phone && (
                  <div className="flex items-center text-sm text-gray-600">
                    <FaHeartbeat className="mr-2 text-red-400" />
                    <span>Phone: {patient.phone}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyPatientsTab;
