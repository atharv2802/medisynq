import React, { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import MyPatientsTab from './MyPatientsTab';
import ProfileTab from './ProfileTab';
import ChatbotTab from './ChatbotTab';
import Head from 'next/head';
import Image from 'next/image';
import { useRouter } from 'next/router';

type TabType = 'patients' | 'profile' | 'chatbot';

const DoctorDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('patients');
  const [doctorName, setDoctorName] = useState<string>('');
  const supabase = createClientComponentClient();
  const router = useRouter();

  useEffect(() => {
    const fetchDoctorProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          router.push('/login');
          return;
        }

        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        setDoctorName(profileData?.full_name || 'Doctor');
      } catch (error) {
        console.error('Error fetching doctor profile:', error);
      }
    };

    fetchDoctorProfile();
  }, []);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      router.push('/login');
    }
  };

  const renderTab = () => {
    switch (activeTab) {
      case 'patients':
        return <MyPatientsTab />;
      case 'profile':
        return <ProfileTab />;
      case 'chatbot':
        return <ChatbotTab />;
      default:
        return <MyPatientsTab />;
    }
  };

  return (
    <>
      <Head>
        <title>Doctor Dashboard - Medisynq</title>
        <meta name="description" content="Doctor's dashboard for managing patients and profile" />
      </Head>
      
      <div className="min-h-screen bg-gray-50 flex">
        {/* Sidebar */}
        <div className="w-64 bg-white shadow-md flex flex-col">
          <div className="p-4 border-b flex items-center">
            <Image 
              src="/icon.svg" 
              alt="Medisynq Logo" 
              width={40} 
              height={40} 
            />
          </div>
          
          <nav className="p-4 flex-grow">
            <div className="space-y-2">
              <button 
                className={`w-full text-left p-3 rounded flex items-center space-x-3 ${activeTab === 'patients' ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-gray-100'}`} 
                onClick={() => setActiveTab('patients')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                </svg>
                <span>My Patients</span>
              </button>
              <button 
                className={`w-full text-left p-3 rounded flex items-center space-x-3 ${activeTab === 'profile' ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-gray-100'}`} 
                onClick={() => setActiveTab('profile')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
                <span>My Profile</span>
              </button>
              <button 
                className={`w-full text-left p-3 rounded flex items-center space-x-3 ${activeTab === 'chatbot' ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-gray-100'}`} 
                onClick={() => setActiveTab('chatbot')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                </svg>
                <span>Chatbot</span>
              </button>
            </div>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-10">
          <header className="mb-8 flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-800">
              Welcome, Dr. {doctorName}
            </h1>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600 mr-4">
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </div>
              <button 
                className="bg-red-500 text-white px-3 py-2 rounded hover:bg-red-600 transition text-sm"
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          </header>

          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <div className="dashboard-content">
              {renderTab()}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default DoctorDashboard;
