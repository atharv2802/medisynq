import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface Record {
  id: string;
  patient_id: string;
  doctor_id: string;
  summary: string;
  file_path: string;
  ai_summary: string | null;
  created_at: string;
  doctor_name: string;
}

export default function RecordsTab() {
  const [records, setRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        const { data, error: recordsError } = await supabase
          .from('records')
          .select(`
            *,
            doctor:profiles!fk_records_doctor(full_name)
          `)
          .eq('patient_id', session.user.id)
          .order('created_at', { ascending: false });

        if (recordsError) throw recordsError;

        setRecords(data.map(record => ({
          ...record,
          doctor_name: record.doctor?.full_name || 'Unknown Doctor'
        })));
      } catch (err) {
        console.error('Error fetching records:', err);
        setError('Failed to load medical records');
      } finally {
        setLoading(false);
      }
    };

    fetchRecords();
  }, [supabase]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setUploadError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('Not authenticated');
      }

      // Generate a unique filename
      const timestamp = Date.now();
      const filePath = `patient-docs/${session.user.id}/${timestamp}_${file.name}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('ehr-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('ehr-files')
        .getPublicUrl(filePath);
      const publicPath = publicUrl ? publicUrl.replace(/^https?:\/\/[^/]+/, '') : '';

      // Create record in database with file metadata
      const { error: recordError } = await supabase
        .from('records')
        .insert({
          patient_id: session.user.id,
          doctor_id: session.user.id, // For self-uploaded files
          file_path: filePath,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          summary: file.name,
          ai_summary: null
        });

      if (recordError) throw recordError;

      // Refresh the records list
      const { data, error: fetchError } = await supabase
        .from('records')
        .select(`
          *,
          doctor:profiles!fk_records_doctor(full_name)
        `)
        .eq('patient_id', session.user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setRecords(data.map(record => ({
        ...record,
        doctor_name: record.doctor?.full_name || 'Unknown Doctor'
      })));
    } catch (err) {
      console.error('Upload error:', err);
      setUploadError(err instanceof Error ? err.message : 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Medical Records</h2>
        <p>Loading records...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Medical Records</h2>
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Medical Records</h2>
        <div className="flex items-center gap-4">
          <input
            type="file"
            onChange={handleFileUpload}
            disabled={uploading}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 transition cursor-pointer disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : 'Upload Document'}
          </label>
        </div>
      </div>

      {uploadError && (
        <div className="mb-4 p-4 bg-red-50 text-red-600 rounded">
          {uploadError}
        </div>
      )}

      {records.length === 0 ? (
        <p className="text-gray-500">No medical records found.</p>
      ) : (
        <div className="space-y-4">
          {records.map(record => (
            <div key={record.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">{record.summary}</h3>
                  <p className="text-sm text-gray-500">
                    Uploaded by: {record.doctor_name}
                  </p>
                  <p className="text-sm text-gray-500">
                    Date: {new Date(record.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <a
                    href={record.file_path}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:text-indigo-800"
                  >
                    Download
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 