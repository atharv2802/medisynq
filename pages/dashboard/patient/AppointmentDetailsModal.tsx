import React from 'react';

interface AppointmentDetailsModalProps {
  open: boolean;
  onClose: () => void;
  appointment: {
    doctor_name: string;
    doctor_email?: string;
    date: string;
    reason: string;
    comments: string;
    status: string;
  } | null;
}

const AppointmentDetailsModal: React.FC<AppointmentDetailsModalProps> = ({ open, onClose, appointment }) => {
  if (!open || !appointment) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md relative">
        <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-600" onClick={onClose}>&times;</button>
        <h2 className="text-2xl font-bold mb-4">Appointment Details</h2>
        <div className="mb-2"><span className="font-semibold">Doctor:</span> {appointment.doctor_name}</div>
        {appointment.doctor_email && <div className="mb-2"><span className="font-semibold">Doctor Email:</span> {appointment.doctor_email}</div>}
        <div className="mb-2"><span className="font-semibold">Date:</span> {new Date(appointment.date).toLocaleString()}</div>
        <div className="mb-2"><span className="font-semibold">Status:</span> {appointment.status}</div>
        <div className="mb-2"><span className="font-semibold">Reason:</span> {appointment.reason}</div>
        <div className="mb-2"><span className="font-semibold">Comments:</span> {appointment.comments}</div>
      </div>
    </div>
  );
};

export default AppointmentDetailsModal; 