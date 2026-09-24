import { useEffect } from 'react';
import { X } from 'lucide-react';
import RiskPredictionCard from './RiskPredictionCard';
import CoachingPanel from './CoachingPanel';
import SimilarVehiclesPanel from './SimilarVehiclesPanel';

export default function RiskModal({ vehicleId, onClose }) {
 
  
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  if (!vehicleId) return null;

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Predictive risk details for vehicle ${vehicleId}`}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl mx-4 my-8 bg-fleet-bg rounded-2xl shadow-2xl animate-in slide-in-from-bottom-4 fade-in duration-300"
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 z-10 h-9 w-9 flex items-center justify-center rounded-full bg-white hover:bg-gray-100 border border-gray-200 text-gray-500 hover:text-gray-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-fleet-border">
          <h2 className="text-xl font-bold text-fleet-text">
            Vehicle {vehicleId} - Predictive Risk
          </h2>
          <p className="text-xs text-fleet-secondary mt-1">
            Logistic regression forecast, updated daily at 03:00 SAST
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <RiskPredictionCard vehicleId={vehicleId} />

          <div className="bg-white rounded-2xl p-6 border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-3">Coaching History</h3>
            <CoachingPanel vehicleId={vehicleId} />
          </div>

          <SimilarVehiclesPanel vehicleId={vehicleId} />
        </div>
      </div>
    </div>
  );
}
