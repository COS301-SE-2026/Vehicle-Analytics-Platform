import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { getVehicleFuelHistory } from '../../services/fuelService';
import { 
    Fuel, TrendingUp, Download, Award, Calendar, Leaf, Gauge, 
    Coins, TrendingDown, Zap, X
} from 'lucide-react';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.06, delayChildren: 0.1 }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
};

const cardVariants = {
    hidden: { opacity: 0, scale: 0.96 },
    visible: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 25 } }
};

function AnimatedCounter({ value, suffix = '', prefix = '', duration = 1200, decimals = 1 }) {
    const [count, setCount] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const ref = useRef(null);
    
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.1 }
        );
        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!isVisible) return;
        let start = 0;
        const step = value / (duration / 16);
        const timer = setInterval(() => {
            start += step;
            if (start >= value) {
                setCount(value);
                clearInterval(timer);
            } else {
                setCount(Math.round(start * Math.pow(10, decimals)) / Math.pow(10, decimals));
            }
        }, 16);
        return () => clearInterval(timer);
    }, [isVisible, value, duration, decimals]);

    return <span ref={ref}>{prefix}{count.toFixed(decimals)}{suffix}</span>;
}

function StatCard({ label, value, suffix = '', icon: Icon, delay = 0, onClick = null }) {
    return (
        <motion.div
            variants={cardVariants}
            transition={{ delay }}
            onClick={onClick}
            className={`relative overflow-hidden bg-white rounded-2xl p-6 shadow-[0_2px_20px_rgba(0,0,0,0.04)] border border-gray-100/80 ${onClick ? 'cursor-pointer hover:shadow-[0_8px_40px_rgba(0,0,0,0.08)]' : ''}`}
        >
            <div className="absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 rounded-full bg-gradient-to-br from-gray-50 to-transparent opacity-30" />
            <div className="relative z-10 flex items-start justify-between">
                <div>
                    <p className="text-[11px] font-medium text-gray-400 uppercase tracking-[0.08em]">{label}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1.5 tracking-tight">
                        <AnimatedCounter value={value} suffix={suffix} decimals={1} />
                    </p>
                </div>
                <div className="p-3 rounded-xl bg-gray-50">
                    <Icon className="w-4 h-4 text-gray-700" />
                </div>
            </div>
        </motion.div>
    );
}

function EfficiencyGauge({ value, max = 20 }) {
    const percentage = Math.min((value / max) * 100, 100);
    const color = percentage > 70 ? '#10B981' : percentage > 40 ? '#F59E0B' : '#EF4444';
    
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
            className="bg-white rounded-2xl p-6 shadow-[0_2px_20px_rgba(0,0,0,0.04)] border border-gray-100/80"
        >
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-gray-50">
                        <Gauge className="w-4 h-4 text-gray-700" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">Efficiency Score</span>
                </div>
                <span className={`text-lg font-bold ${percentage > 70 ? 'text-emerald-500' : percentage > 40 ? 'text-amber-500' : 'text-rose-500'}`}>
                    {value.toFixed(1)}
                </span>
            </div>
            <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(percentage, 100)}%` }}
                    transition={{ delay: 0.4, duration: 1.2, ease: 'easeOut' }}
                    className="absolute inset-0 rounded-full"
                    style={{ background: `linear-gradient(90deg, ${color}dd, ${color})` }}
                />
            </div>
            <div className="flex justify-between mt-2">
                <span className="text-[10px] text-gray-400 font-medium">0</span>
                <span className="text-[10px] text-gray-400 font-medium">{max} km/L</span>
            </div>
            <div className="flex justify-between mt-3.5">
                <span className="text-[10px] text-gray-400">Needs Work</span>
                <span className="text-[10px] text-gray-400">Good</span>
                <span className="text-[10px] text-gray-400">Excellent</span>
            </div>
        </motion.div>
    );
}

function EmissionsCard({ fuelUsed }) {
    const co2PerLiter = 2.31;
    const totalCO2 = fuelUsed * co2PerLiter;
    if (fuelUsed <= 0) return null;
    
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="relative overflow-hidden bg-white rounded-2xl p-6 shadow-[0_2px_20px_rgba(0,0,0,0.04)] border border-gray-100/80"
        >
            <div className="absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 rounded-full bg-gradient-to-br from-gray-50 to-transparent opacity-30" />
            <div className="relative z-10">
                <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-gray-50">
                        <Leaf className="w-4 h-4 text-gray-700" />
                    </div>
                    <span className="text-[10px] font-medium text-gray-400 uppercase tracking-[0.1em]">Carbon Impact</span>
                </div>
                <p className="text-3xl font-bold text-gray-900 tracking-tight mt-3">
                    {totalCO2.toFixed(1)}
                    <span className="text-sm font-normal text-gray-400 ml-1.5">kg CO2</span>
                </p>
                <p className="text-sm text-gray-500 mt-0.5">From {fuelUsed.toFixed(1)}L fuel consumed</p>
                <div className="mt-3.5">
                    <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                        Offsets ~{Math.round(totalCO2 * 0.5)} trees/year
                    </span>
                </div>
            </div>
        </motion.div>
    );
}

function SavingsCard({ currentEfficiency, targetEfficiency = 12, distance = 1000 }) {
    if (currentEfficiency <= 0) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="bg-gradient-to-br from-gray-50 to-gray-100/30 rounded-2xl p-6 border border-gray-200/40"
            >
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-[0.1em]">Potential Savings</p>
                        <p className="text-2xl font-bold text-gray-400 mt-1">
                            0.0 <span className="text-sm font-normal text-gray-400">litres</span>
                        </p>
                        <p className="text-sm text-gray-400 mt-0.5">No savings available</p>
                    </div>
                    <div className="p-3 rounded-xl bg-gray-100/50">
                        <Coins className="w-5 h-5 text-gray-400" />
                    </div>
                </div>
            </motion.div>
        );
    }
    
    const currentFuel = distance / currentEfficiency;
    const targetFuel = distance / targetEfficiency;
    const savings = currentFuel - targetFuel;
    
    if (currentEfficiency >= targetEfficiency) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="bg-gradient-to-br from-emerald-50 to-emerald-100/30 rounded-2xl p-6 border border-emerald-200/40"
            >
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-[10px] font-medium text-emerald-600/70 uppercase tracking-[0.1em]">Potential Savings</p>
                        <p className="text-2xl font-bold text-emerald-600 mt-1">
                            0.0 <span className="text-sm font-normal text-emerald-500">litres</span>
                        </p>
                        <p className="text-sm text-emerald-600 mt-0.5">Already at or above target!</p>
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-100/50">
                        <Award className="w-5 h-5 text-emerald-600" />
                    </div>
                </div>
            </motion.div>
        );
    }
    
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="bg-gradient-to-br from-emerald-50 to-emerald-100/30 rounded-2xl p-6 border border-emerald-200/40"
        >
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-[10px] font-medium text-emerald-600/70 uppercase tracking-[0.1em]">Potential Savings</p>
                    <p className="text-2xl font-bold text-emerald-600 mt-1">
                        {savings.toFixed(1)} <span className="text-sm font-normal text-emerald-500">litres</span>
                    </p>
                    <p className="text-sm text-gray-500 mt-0.5">Improve to {targetEfficiency} km/L</p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-100/50">
                    <Coins className="w-5 h-5 text-emerald-600" />
                </div>
            </div>
        </motion.div>
    );
}

function BestWorstTrips({ trips }) {
    if (!trips || trips.length < 2) return null;
    const sorted = [...trips].sort((a, b) => Number.parseFloat(b.fuel_efficiency_km_per_liter) - Number.parseFloat(a.fuel_efficiency_km_per_liter));
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];
    const bestEff = Number.parseFloat(best.fuel_efficiency_km_per_liter) || 0;
    const worstEff = Number.parseFloat(worst.fuel_efficiency_km_per_liter) || 0;
    if (bestEff === 0 && worstEff === 0) return null;
    
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="grid grid-cols-2 gap-3"
        >
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/30 rounded-2xl p-5 border border-emerald-200/30">
                <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-lg bg-emerald-100">
                        <Award className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <span className="text-[10px] font-medium text-emerald-600 uppercase tracking-[0.08em]">Best</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{bestEff.toFixed(1)} <span className="text-sm font-normal text-gray-400">km/L</span></p>
                <p className="text-xs text-gray-400 mt-1">{new Date(best.trip_date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}</p>
            </div>
            <div className="bg-gradient-to-br from-rose-50 to-rose-100/30 rounded-2xl p-5 border border-rose-200/30">
                <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-lg bg-rose-100">
                        <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
                    </div>
                    <span className="text-[10px] font-medium text-rose-500 uppercase tracking-[0.08em]">Lowest</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{worstEff.toFixed(1)} <span className="text-sm font-normal text-gray-400">km/L</span></p>
                <p className="text-xs text-gray-400 mt-1">{new Date(worst.trip_date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}</p>
            </div>
        </motion.div>
    );
}

function EfficiencyBreakdownModal({ isOpen, onClose, avgEfficiency }) {
    if (!isOpen) return null;
    
    const ROAD_FUEL_RATES = {
        motorway: 6.0,
        motorway_link: 6.5,
        trunk: 6.5,
        trunk_link: 7.0,
        primary: 7.0,
        primary_link: 7.5,
        secondary: 8.5,
        secondary_link: 8.5,
        tertiary: 9.0,
        tertiary_link: 9.5,
        residential: 10.0,
        living_street: 11.0,
        service: 9.0,
        unclassified: 8.5,
        road: 9.0,
    };
    
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white rounded-3xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-8 shadow-2xl"
            >
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-gray-900">
                            <Zap className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Efficiency Breakdown</h2>
                            <p className="text-sm text-gray-400">Average: {avgEfficiency.toFixed(1)} km/L</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>
                <div className="space-y-4">
                    <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-[0.08em] mb-3">Road Type Fuel Rates</p>
                        <div className="grid grid-cols-2 gap-2">
                            {Object.entries(ROAD_FUEL_RATES).map(([road, rate]) => (
                                <div key={road} className="flex items-center justify-between px-3 py-2 bg-white rounded-lg border border-gray-100">
                                    <span className="text-sm text-gray-600 capitalize">{road.replace('_', ' ')}</span>
                                    <span className="text-sm font-medium text-gray-900">{rate.toFixed(1)} L/100km</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200/50">
                        <p className="text-xs font-medium text-emerald-600 uppercase tracking-[0.08em]">How It's Calculated</p>
                        <p className="text-sm text-gray-600 mt-1">
                            Fuel consumed = (Distance / 100) x Fuel Rate x Speed Factor
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">Speed factor adjusts for optimal efficiency at 55-65 km/h</p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

export default function VehicleFuelTab({ vehicleId }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => {
        return new Date().toISOString().split('T')[0];
    });
    const [showBreakdownModal, setShowBreakdownModal] = useState(false);

    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            try {
                const history = await getVehicleFuelHistory(vehicleId, 'week', 30);
                
                if (!history || history.length === 0) {
                    setData(null);
                    setLoading(false);
                    return;
                }
                
                const start = new Date(startDate);
                const end = new Date(endDate);
                const filtered = history.filter(h => {
                    const d = new Date(h.period_start);
                    return d >= start && d <= end;
                });
                
                if (filtered.length === 0) {
                    setData(null);
                    setLoading(false);
                    return;
                }
                
                const trips = filtered.map((h, idx) => ({
                    trip_id: idx + 1,
                    trip_date: h.period_start,
                    total_distance_km: Number.parseFloat(h.total_distance || 0),
                    estimated_fuel_consumed_liters: Number.parseFloat(h.total_fuel || 0),
                    fuel_efficiency_km_per_liter: Number.parseFloat(h.avg_efficiency || 0),
                    avg_speed_kmh: 0,
                    road_breakdown: h.road_class_breakdown || { motorway: 0, primary: 0, residential: 0, other: 0 }
                }));
                
                const totalDistance = filtered.reduce((sum, h) => sum + Number.parseFloat(h.total_distance || 0), 0);
                const totalFuel = filtered.reduce((sum, h) => sum + Number.parseFloat(h.total_fuel || 0), 0);
                const avgEff = totalDistance > 0 && totalFuel > 0 ? totalDistance / totalFuel : 0;
                
                const roadBreakdown = { motorway: 0, primary: 0, residential: 0, other: 0 };
                trips.forEach(trip => {
                    if (trip.road_breakdown) {
                        Object.keys(roadBreakdown).forEach(key => {
                            roadBreakdown[key] += Number.parseFloat(trip.road_breakdown[key] || 0);
                        });
                    }
                });
                
                setData({
                    trips: trips,
                    summary: {
                        avg_efficiency: avgEff,
                        total_distance: totalDistance,
                        total_fuel: totalFuel,
                        trip_count: trips.length,
                        road_breakdown: roadBreakdown,
                        avg_safety_score: 0,
                        start_date: startDate,
                        end_date: endDate
                    }
                });
            } catch (err) {
                console.error('Failed to fetch fuel data:', err);
                setData(null);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [vehicleId, startDate, endDate]);

    const handleExport = () => {
        if (!data) return;
        const headers = ['Date', 'Distance (km)', 'Fuel (L)', 'Efficiency (km/L)'];
        const rows = data.trips.map(t => [
            new Date(t.trip_date).toLocaleDateString(),
            Number.parseFloat(t.total_distance_km).toFixed(1),
            Number.parseFloat(t.estimated_fuel_consumed_liters).toFixed(1),
            Number.parseFloat(t.fuel_efficiency_km_per_liter).toFixed(1)
        ]);
        const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fuel-efficiency-${vehicleId}-${startDate}-to-${endDate}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
            </div>
        );
    }

    if (!data || data.trips.length === 0) {
        return (
            <div className="flex items-center justify-center h-64">
                <p className="text-gray-400">No fuel data available for this vehicle</p>
            </div>
        );
    }

    const totalDistance = Math.round(data.summary.total_distance);
    const totalFuel = Math.round(data.summary.total_fuel);

    const maxEff = data.trips.length > 0 ? Math.max(...data.trips.map(t => Number.parseFloat(t.fuel_efficiency_km_per_liter) || 0)) : 0;
    const minEff = data.trips.length > 0 ? Math.min(...data.trips.map(t => Number.parseFloat(t.fuel_efficiency_km_per_liter) || 0)) : 0;

    const roadData = Object.entries(data.summary.road_breakdown || {})
        .filter(([_, value]) => value > 0)
        .map(([name, value]) => ({
            name: name.charAt(0).toUpperCase() + name.slice(1),
            value: Number.parseFloat(value).toFixed(1)
        }));

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-5"
        >
            {/* Modal */}
            <EfficiencyBreakdownModal
                isOpen={showBreakdownModal}
                onClose={() => setShowBreakdownModal(false)}
                avgEfficiency={data.summary.avg_efficiency}
            />

            <motion.div variants={itemVariants} className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-gray-900 shadow-lg shadow-gray-900/20">
                        <Fuel className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 tracking-tight">Fuel Efficiency</h3>
                        <p className="text-sm text-gray-400">
                            Vehicle {vehicleId} · {data.summary.trip_count} trips · 
                            {new Date(startDate).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })} 
                            {' - '}
                            {new Date(endDate).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/20"
                        />
                        <span className="text-xs text-gray-400">to</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/20"
                        />
                    </div>
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleExport}
                        className="flex items-center gap-2 text-sm px-4 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-900 hover:text-white hover:border-gray-900 transition-all duration-300"
                    >
                        <Download className="w-4 h-4" />
                        Export
                    </motion.button>
                </div>
            </motion.div>

            <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                    label="Avg Efficiency"
                    value={data.summary.avg_efficiency}
                    suffix=" km/L"
                    icon={TrendingUp}
                    delay={0.1}
                    onClick={() => setShowBreakdownModal(true)}
                />
                <StatCard label="Total Distance" value={totalDistance} suffix=" km" icon={Calendar} delay={0.15} />
                <StatCard label="Total Fuel" value={totalFuel} suffix=" L" icon={Fuel} delay={0.2} />
                <StatCard label="Trips" value={data.summary.trip_count} icon={Award} delay={0.25} />
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <EfficiencyGauge value={data.summary.avg_efficiency} />
                <EmissionsCard fuelUsed={totalFuel} />
                <SavingsCard currentEfficiency={data.summary.avg_efficiency} distance={totalDistance} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <BestWorstTrips trips={data.trips} />
            </div>

            {/* Road Breakdown - Bar Chart */}
            {roadData.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="bg-white rounded-2xl p-5 shadow-[0_2px_20px_rgba(0,0,0,0.04)] border border-gray-100/80"
                >
                    <div className="flex items-center justify-between mb-3.5">
                        <div className="flex items-center gap-2.5">
                            <span className="text-xs font-medium text-gray-400 uppercase tracking-[0.08em]">Road Breakdown</span>
                        </div>
                        <span className="text-xs text-gray-400">{data.summary.trip_count} trips</span>
                    </div>
                    <div className="space-y-3">
                        {roadData.map((item, idx) => {
                            const total = roadData.reduce((sum, r) => sum + Number.parseFloat(r.value), 0);
                            const percentage = total > 0 ? (Number.parseFloat(item.value) / total) * 100 : 0;
                            const colors = ['#8B5CF6', '#10B981', '#F59E0B', '#EF4444'];
                            return (
                                <div key={`${item.name}-${idx}`} className="flex items-center gap-3">
                                    <span className="text-sm text-gray-600 w-20 capitalize">{item.name}</span>
                                    <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2 text-xs text-white font-medium"
                                            style={{ 
                                                width: `${Math.max(percentage, 2)}%`,
                                                backgroundColor: colors[idx % colors.length]
                                            }}
                                        >
                                            {percentage > 8 && `${percentage.toFixed(0)}%`}
                                        </div>
                                    </div>
                                    <span className="text-sm font-medium text-gray-900 w-16 text-right">
                                        {Number.parseFloat(item.value).toFixed(1)} km
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </motion.div>
            )}

            {/* All Trips History */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="bg-white rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] border border-gray-100/80 overflow-hidden"
            >
                <div className="p-5 border-b border-gray-50 flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-[0.08em]">All Trips History</span>
                    <span className="text-[10px] text-gray-400">
                        <span className="inline-block w-3 h-3 rounded-full bg-emerald-500 border border-emerald-400 mr-1 align-middle"></span>
                        Best
                        <span className="mx-2">|</span>
                        <span className="inline-block w-3 h-3 rounded-full bg-rose-500 border border-rose-400 mr-1 align-middle"></span>
                        Lowest
                    </span>
                </div>
                <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-white z-10">
                            <tr className="border-b border-gray-50">
                                <th className="text-left py-3 px-5 text-[10px] font-medium text-gray-400 uppercase tracking-[0.08em]">Date</th>
                                <th className="text-right py-3 px-5 text-[10px] font-medium text-gray-400 uppercase tracking-[0.08em]">Distance</th>
                                <th className="text-right py-3 px-5 text-[10px] font-medium text-gray-400 uppercase tracking-[0.08em]">Fuel</th>
                                <th className="text-right py-3 px-5 text-[10px] font-medium text-gray-400 uppercase tracking-[0.08em]">Efficiency</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.trips && data.trips.length > 0 ? (
                                data.trips.map((trip, i) => {
                                    const eff = Number.parseFloat(trip.fuel_efficiency_km_per_liter) || 0;
                                    const isBest = eff === maxEff && maxEff > 0 && data.trips.length > 1;
                                    const isLowest = eff === minEff && minEff > 0 && eff !== maxEff && data.trips.length > 1;
                                    
                                    let color = 'bg-gray-50 text-gray-600';
                                    let rowClass = '';
                                    
                                    if (isBest) {
                                        color = 'bg-emerald-500 text-white font-bold';
                                        rowClass = 'bg-emerald-100 hover:bg-emerald-200 transition-colors';
                                    } else if (isLowest) {
                                        color = 'bg-rose-500 text-white font-bold';
                                        rowClass = 'bg-rose-100 hover:bg-rose-200 transition-colors';
                                    }
                                    
                                    return (
                                        <motion.tr
                                            key={i}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: 0.02 * i }}
                                            className={`border-b border-gray-50/50 hover:bg-gray-50/30 transition-colors ${rowClass}`}
                                        >
                                            <td className="py-3 px-5 text-gray-700 text-sm">
                                                {trip.trip_date ? new Date(trip.trip_date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                                            </td>
                                            <td className="text-right py-3 px-5 text-gray-700 text-sm">
                                                {Number.parseFloat(trip.total_distance_km || 0).toFixed(1)} km
                                            </td>
                                            <td className="text-right py-3 px-5 text-gray-700 text-sm">
                                                {Number.parseFloat(trip.estimated_fuel_consumed_liters || 0).toFixed(1)} L
                                            </td>
                                            <td className="text-right py-3 px-5">
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${color}`}>
                                                    {eff.toFixed(1)} km/L
                                                    {isBest {isBest && ' Best'}{isBest && ' Best'} <span> Best</span>}
                                                    {isLowest {isLowest && ' Lowest'}{isLowest && ' Lowest'} <span> Lowest</span>}
                                                </span>
                                            </td>
                                        </motion.tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="4" className="text-center py-8 text-gray-400">No trip data available</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </motion.div>
        </motion.div>
    );
}
