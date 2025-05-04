import React, { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface Patient {
  id: string;
  full_name: string;
  email: string;
}

interface AppointmentResponse {
  patient: Patient[];
}

const DoctorDashboard: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [files, setFiles] = useState<any[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [filesError, setFilesError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchPatients = async () => {
      const supabase = createClientComponentClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data, error } = await supabase
        .from('appointments')
        .select('patient:patient_id(id, full_name, email)')
        .eq('doctor_id', session.user.id);
      if (error) {
        console.error('Error fetching patients:', error);
        setPatients([]);
      } else {
        // Ensure data is an array and handle null/undefined cases
        const patientList = Array.isArray(data) 
          ? data.flatMap((p: AppointmentResponse) => p?.patient || [])
          : [];
        const unique = Array.from(new Map(patientList.map(p => [p.id, p])).values());
        setPatients(unique);
      }
    };
    fetchPatients();
  }, []);

  const fetchFiles = async (patientId: string) => {
    setFilesLoading(true);
    setFilesError(null);
    const supabase = createClientComponentClient();
    const { data, error } = await supabase
      .from('records')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });
    if (error) {
      setFilesError('Failed to load records.');
      setFiles([]);
    } else {
      setFiles(data || []);
    }
    setFilesLoading(false);
  };

  useEffect(() => {
    if (selectedPatient) fetchFiles(selectedPatient);
  }, [selectedPatient]);

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);
    const supabase = createClientComponentClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session || !file || !selectedPatient) {
      setUploadError('No file, not authenticated, or no patient selected.');
      setUploading(false);
      return;
    }

    try {
      // Generate a unique filename
      const timestamp = Date.now();
      const filePath = `patient-docs/${selectedPatient}/${timestamp}_${file.name}`;

      // Upload the file
      const { error: uploadError } = await supabase.storage
        .from('ehr-files')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error('Failed to upload file. Please try again.');
      }

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('ehr-files')
        .getPublicUrl(filePath);

      // Save file metadata to records table
      const { error: recordError } = await supabase
        .from('records')
        .insert({
          patient_id: selectedPatient,
          doctor_id: session.user.id,
          file_url: publicUrl,
          summary: file.name,
          ai_summary: null
        });

      if (recordError) {
        console.error('Record error:', recordError);
        throw new Error('Failed to save file metadata.');
      }

      setUploadSuccess('File uploaded successfully!');
      setFile(null);
      fetchFiles(selectedPatient);
    } catch (err) {
      console.error('Upload error:', err);
      setUploadError(err instanceof Error ? err.message : 'An error occurred during upload.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-4">Doctor Dashboard</h1>
      <div className="mb-6">
        <label className="block font-semibold mb-1">Select Patient</label>
        <select
          className="w-full border px-3 py-2 rounded"
          value={selectedPatient}
          onChange={e => setSelectedPatient(e.target.value)}
        >
          <option value="">Select a patient</option>
          {patients.map(p => (
            <option key={p.id} value={p.id}>{p.full_name} ({p.email})</option>
          ))}
        </select>
      </div>
      {selectedPatient && (
        <>
          <div className="bg-white rounded shadow p-4 mb-6">
            <h3 className="font-semibold mb-2">Upload File for Patient</h3>
            <form onSubmit={handleFileUpload} className="flex flex-col md:flex-row gap-4 items-center">
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={e => setFile(e.target.files?.[0] || null)}
                className="border px-3 py-2 rounded w-full md:w-auto"
              />
              <button
                type="submit"
                className="bg-indigo-500 text-white px-6 py-2 rounded font-semibold hover:bg-indigo-600 transition"
                disabled={uploading || !file}
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </form>
            {uploadError && <div className="text-red-500 text-sm mt-2">{uploadError}</div>}
            {uploadSuccess && <div className="text-green-600 text-sm mt-2">{uploadSuccess}</div>}
          </div>
          <div className="bg-white rounded shadow p-4">
            <h3 className="font-semibold mb-2">Patient's Uploaded Files</h3>
            {filesLoading ? (
              <div className="text-gray-500">Loading files...</div>
            ) : filesError ? (
              <div className="text-red-500">{filesError}</div>
            ) : files.length === 0 ? (
              <div className="text-gray-500">No files uploaded yet.</div>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr>
                    <th className="py-2">File Name</th>
                    <th className="py-2">Uploaded At</th>
                    <th className="py-2">Uploaded By</th>
                    <th className="py-2">Download</th>
                  </tr>
                </thead>
                <tbody>
                  {files.map(f => (
                    <tr key={f.id} className="border-t">
                      <td className="py-2">{f.file_name}</td>
                      <td className="py-2">{new Date(f.uploaded_at).toLocaleString()}</td>
                      <td className="py-2">{f.uploaded_by}</td>
                      <td className="py-2">
                        <a
                          href={`https://$${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('https://', '')}/storage/v1/object/public/ehr-files/${f.file_url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 underline"
                        >
                          Download
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default DoctorDashboard;
  