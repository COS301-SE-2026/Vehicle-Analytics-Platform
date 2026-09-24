import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users } from 'lucide-react';
import { getSimilarVehicles } from '@/services/riskService';
import RiskBadge from './RiskBadge';

export default function SimilarVehiclesPanel({ vehicleId }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    getSimilarVehicles(vehicleId, 5)
      .then((d) => {
        if (cancelled) return;
        setData(Array.isArray(d) ? d : []);
      })
      .catch((err) => {
        console.warn('SimilarVehiclesPanel: failed to load neighbours', err?.message);
        if (!cancelled) setData([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [vehicleId]);

  const openVehicle = (id) => {
    navigate(`/risk?focus=${encodeURIComponent(id)}`);
  };

  if (loading) return <div className="text-sm text-gray-400">Finding similar vehicles…</div>;

  if (!data.length) {
    return (
      <p className="text-sm text-gray-400">
        No similar vehicles found in the fleet.
      </p>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-sky-50">
          <Users className="w-5 h-5 text-sky-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Similar Vehicles</h3>
          <p className="text-xs text-gray-400">
            Nearest neighbours in behavioural feature space
          </p>
        </div>
      </div>

      <ul className="space-y-2">
        {data.map((v) => (
          <li key={v.vehicle_id}>
            <button
              type="button"
              onClick={() => openVehicle(v.vehicle_id)}
              className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="font-medium text-gray-900">{v.vehicle_id}</span>
                <span className="text-xs text-gray-400">
                  distance {v.distance}
                </span>
              </div>
              {v.risk_tier
                ? <RiskBadge tier={v.risk_tier} score={v.risk_score} />
                : <span className="text-xs text-gray-400">no prediction</span>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
