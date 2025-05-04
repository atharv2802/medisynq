import React from 'react';

interface TabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Tabs: React.FC<TabsProps> = ({ activeTab, setActiveTab }) => {
  return (
    <div className="flex border-b mb-6">
      <button
        className={`px-4 py-2 font-semibold ${activeTab === 'appointments' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-gray-500'}`}
        onClick={() => setActiveTab('appointments')}
      >
        Appointments
      </button>
      <button
        className={`ml-4 px-4 py-2 font-semibold ${activeTab === 'profile' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-gray-500'}`}
        onClick={() => setActiveTab('profile')}
      >
        Profile
      </button>
    </div>
  );
};

export default Tabs; 