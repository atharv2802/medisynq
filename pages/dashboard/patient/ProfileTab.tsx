import React, { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/router';

interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  address: string;
  date_of_birth: string;
  gender: string;
  allergies: string;
  past_medical_history: string;
  created_at: string;
}

const ProfileTab: React.FC = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Profile>>({});
  const [saveLoading, setSaveLoading] = useState(false);
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          router.push('/login');
          return;
        }

        const { data, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profileError) throw profileError;
        setProfile(data);
        setEditForm(data);
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [supabase, router]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditForm(profile || {});
  };

  const handleSave = async () => {
    try {
      setSaveLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Not authenticated');

      // Prepare the update data with exact field names from database
      const updateData = {
        phone: editForm.phone,
        address: editForm.address,
        gender: editForm.gender,
        allergies: editForm.allergies,
        past_medical_history: editForm.past_medical_history
      };

      // Update the profile in Supabase
      const { error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', session.user.id);

      if (updateError) {
        console.error('Update error:', updateError);
        throw new Error('Failed to update profile');
      }

      // Update local state with exact field names
      setProfile(prev => prev ? { 
        ...prev, 
        phone: updateData.phone,
        address: updateData.address,
        gender: updateData.gender,
        allergies: updateData.allergies,
        past_medical_history: updateData.past_medical_history
      } : null);
      setIsEditing(false);
    } catch (err) {
      console.error('Update error:', err);
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setSaveLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Profile</h2>
        <p>Loading profile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Profile</h2>
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Profile</h2>
        {!isEditing && (
          <button
            onClick={handleEdit}
            className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 transition"
          >
            Edit Profile
          </button>
        )}
      </div>
      
      <div className="space-y-4">
        {/* Non-editable fields */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Full Name</label>
          <p className="mt-1">{profile?.full_name}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <p className="mt-1">{profile?.email}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
          <p className="mt-1">{profile?.date_of_birth}</p>
        </div>

        {/* Editable fields */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Phone</label>
          {isEditing ? (
            <input
              type="text"
              value={editForm.phone || ''}
              onChange={e => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          ) : (
            <p className="mt-1">{profile?.phone}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Address</label>
          {isEditing ? (
            <input
              type="text"
              value={editForm.address || ''}
              onChange={e => setEditForm(prev => ({ ...prev, address: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          ) : (
            <p className="mt-1">{profile?.address}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Gender</label>
          {isEditing ? (
            <select
              value={editForm.gender || ''}
              onChange={e => setEditForm(prev => ({ ...prev, gender: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          ) : (
            <p className="mt-1">{profile?.gender}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Allergies</label>
          {isEditing ? (
            <textarea
              value={editForm.allergies || ''}
              onChange={e => setEditForm(prev => ({ ...prev, allergies: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              rows={3}
            />
          ) : (
            <p className="mt-1">{profile?.allergies}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Medical History</label>
          {isEditing ? (
            <textarea
              value={editForm.past_medical_history || ''}
              onChange={e => setEditForm(prev => ({ ...prev, past_medical_history: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              rows={3}
            />
          ) : (
            <p className="mt-1">{profile?.past_medical_history}</p>
          )}
        </div>

        {isEditing && (
          <div className="flex justify-end gap-4 mt-6">
            <button
              onClick={handleCancel}
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saveLoading}
              className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 transition disabled:opacity-50"
            >
              {saveLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileTab; 