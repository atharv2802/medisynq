import React, { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface DoctorProfile {
  id: string;
  full_name: string;
  email: string;
}

const ProfileTab: React.FC = () => {
  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) return;

        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        setProfile(profileData);
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };

    fetchProfile();
  }, [supabase]);

  if (!profile) return <div>Loading profile...</div>;

  return (
    <div className="profile-tab p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">My Profile</h2>

      <div className="bg-white shadow-md rounded-lg p-6 space-y-4">
        <div>
          <span className="text-sm text-gray-500">Full Name</span>
          <p className="text-lg font-semibold">{profile.full_name}</p>
        </div>
        <div>
          <span className="text-sm text-gray-500">Email</span>
          <p className="text-lg">{profile.email}</p>
        </div>
      </div>
    </div>
  );
};

export default ProfileTab;
