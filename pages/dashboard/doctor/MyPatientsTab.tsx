import React, { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { FaUserMd, FaUserInjured, FaCalendarAlt, FaHeartbeat } from 'react-icons/fa';

interface Patient {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  dob?: string;
  gender?: string;
}

const MyPatientsTab: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setLoading(false);
          return;
        }

        const { data: patientsData, error } = await supabase
          .from('patients')
          .select('*')
          .eq('doctor_id', user.id);

        if (error) throw error;

        setPatients(patientsData || []);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching patients:', error);
        setLoading(false);
      }
    };

    fetchPatients();
  }, [supabase]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-blue-500"></div>
      </div>
    );
  }

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
