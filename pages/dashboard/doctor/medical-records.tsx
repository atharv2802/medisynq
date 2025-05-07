import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface MedicalRecord {
  id: string;
  patient_id: string;
  file_path: string;
  file_name?: string;
  description?: string;
  created_at: string;
  download_url?: string;
}

interface Patient {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  dob?: string;
  gender?: string;
}

const MedicalRecordsPage: React.FC = () => {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);

  const patientId = router.query.patient_id as string;

  useEffect(() => {
    const stored = localStorage.getItem('selectedPatient');
    if (stored) {
      setPatient(JSON.parse(stored));
    } else {
      setPatient(null);
    }
  }, []);

  useEffect(() => {
    if (!patientId) return;
    const fetchRecords = async () => {
      setLoading(true);
      const { data: recordsData, error: recordsError } = await supabase
        .from('records')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      if (!recordsError && recordsData) {
        const recordsWithUrls = await Promise.all(
          recordsData.map(async (record) => {
            if (record.file_path) {
              try {
                const { data: { signedUrl } } = await supabase.storage
                  .from('ehr-files')
                  .createSignedUrl(record.file_path, 3600);
                return { ...record, download_url: signedUrl };
              } catch (e) {
                console.error('Error generating signed URL:', e);
                return { ...record, download_url: null };
              }
            }
            return { ...record, download_url: null };
          })
        );
        setRecords(recordsWithUrls);
      }

      setLoading(false);
    };
    fetchRecords();
  }, [patientId, supabase]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !patientId) return;

    setUploading(true);

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      alert('Not authenticated or Unable to get doctor ID');
      setUploading(false);
      return;
    }

    const fileExt = file.name.split('.').pop() || 'dat';
    const fileName = `${patientId}_${Date.now()}.${fileExt}`;

    const { data: storageData, error: storageError } = await supabase.storage
      .from('ehr-files')
      .upload(fileName, file);

    if (storageError || !storageData?.path) {
      alert('Error uploading file');
      setUploading(false);
      return;
    }

    const { error: dbError } = await supabase
      .from('records')
      .insert({
        patient_id: patientId,
        doctor_id: session.user.id,
        file_path: storageData.path,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        summary: file.name,
        ai_summary: null
      });

    if (dbError) {
      console.error('Insert error:', dbError);
      alert('Error saving record');
    } else {
      setFile(null);
      const { data: recordsData } = await supabase
        .from('records')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });
      setRecords(recordsData || []);
    }

    setUploading(false);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-full">Loading...</div>;
  }

  if (!patient) {
    return <div className="p-4">Patient not found.</div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-2">Medical Records for {patient.full_name}</h1>
      <div className="mb-4 text-gray-600">
        <p>Email: {patient.email}</p>
        <p>Phone: {patient.phone || 'N/A'}</p>
        <p>Date of Birth: {patient.dob || 'N/A'}</p>
        <p>Gender: {patient.gender || 'N/A'}</p>
      </div>

      <form onSubmit={handleUpload} className="mb-6 p-4 bg-blue-50 rounded">
        <label className="block mb-2 font-semibold">Upload New Record</label>
        <div className="mb-2">
          <input
            id="file-upload"
            type="file"
            accept="application/pdf,image/*"
            onChange={handleFileChange}
            disabled={uploading}
            className="hidden"
          />
          <label
            htmlFor="file-upload"
            className={`inline-block px-4 py-2 text-white rounded cursor-pointer transition ${
              uploading ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {file ? `Selected: ${file.name}` : 'Choose File'}
          </label>
        </div>
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          disabled={uploading}
        >
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
      </form>

      <button
        onClick={() => (window.location.href = '/dashboard/doctor')}
        className="mb-4 flex items-center text-blue-600 hover:text-blue-800 font-semibold"
      >
        <svg
          className="w-5 h-5 mr-2"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"></path>
        </svg>
        Back to Dashboard
      </button>

      <h2 className="text-xl font-semibold mb-2">Record List</h2>
      {records.length === 0 ? (
        <div className="text-gray-500">No records found.</div>
      ) : (
        <ul className="space-y-4">
          {records.map((record) => {
            const fileName = record.file_name || (record.file_path ? record.file_path.split('/').pop() : '');
            const fileHref = record.download_url;

            return (
              <li
                key={record.id}
                className="p-4 bg-white rounded shadow flex flex-col md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-semibold">{fileName || 'No file name'}</p>
                  <p className="text-xs text-gray-500">Uploaded: {new Date(record.created_at).toLocaleString()}</p>
                </div>
                {fileHref ? (
                  <a
                    href={fileHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition text-center mt-2 md:mt-0"
                  >
                    Download
                  </a>
                ) : (
                  <span className="text-gray-400">No file</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default MedicalRecordsPage;
