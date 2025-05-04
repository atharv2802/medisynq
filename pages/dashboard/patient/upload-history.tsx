import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function UploadHistory() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleUpload = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          router.push('/login');
          return;
        }

        const pendingFile = localStorage.getItem('pending_history_file');
        if (!pendingFile) {
          router.push('/dashboard/patient');
          return;
        }

        const fileData = JSON.parse(pendingFile);
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = fileData.type;
        fileInput.onchange = async (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) {
            const filePath = `patient-docs/${session.user.id}/${Date.now()}_${file.name}`;
            
            // Upload the file
            const { error: uploadError } = await supabase.storage
              .from('ehr-files')
              .upload(filePath, file);

            if (uploadError) {
              console.error('File upload error:', uploadError);
              setError('Failed to upload file. Please try again.');
            } else {
              // Get the public URL
              const { data: { publicUrl } } = supabase.storage
                .from('ehr-files')
                .getPublicUrl(filePath);

              // Insert the file into records table
              const { error: recordError } = await supabase
                .from('records')
                .insert({
                  patient_id: session.user.id,
                  doctor_id: session.user.id, // For self-uploaded files
                  file_path: filePath,
                  file_name: file.name,
                  file_type: file.type,
                  file_size: file.size,
                  summary: 'Past Medical History',
                  ai_summary: null
                });

              if (recordError) throw recordError;

              // Clear the pending file from localStorage
              localStorage.removeItem('pending_history_file');
              router.push('/dashboard/patient');
            }
          }
        };
        fileInput.click();
      } catch (err) {
        console.error('Upload error:', err);
        setError('An error occurred. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    handleUpload();
  }, [router, supabase]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Processing your request...</h1>
          <p className="text-gray-600">Please wait while we set up your account.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-red-600">Error</h1>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={() => router.push('/dashboard/patient')}
            className="mt-4 px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return null;
} 