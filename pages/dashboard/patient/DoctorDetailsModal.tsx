import React from 'react';

interface DoctorDetailsModalProps {
  open: boolean;
  onClose: () => void;
  doctor: {
    name: string;
    email?: string;
    specialty?: string;
  } | null;
}

const DoctorDetailsModal: React.FC<DoctorDetailsModalProps> = ({ open, onClose, doctor }) => {
  if (!open || !doctor) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md relative">
        <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-600" onClick={onClose}>&times;</button>
        <h2 className="text-2xl font-bold mb-4">Doctor Details</h2>
        <div className="mb-2"><span className="font-semibold">Name:</span> {doctor.name}</div>
        {doctor.email && <div className="mb-2"><span className="font-semibold">Email:</span> {doctor.email}</div>}
        {doctor.specialty && <div className="mb-2"><span className="font-semibold">Specialty:</span> {doctor.specialty}</div>}
      </div>
    </div>
  );
};

export default DoctorDetailsModal; 