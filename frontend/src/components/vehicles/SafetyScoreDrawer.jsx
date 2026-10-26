import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Award, TrendingUp, Info, AlertTriangle, Calculator, ChevronDown, ChevronUp, ArrowLeft } from 'lucide-react';

const PENALTIES = {
    harsh_braking: 5,
    harsh_acceleration: 5,
    harsh_cornering: 3,
    speeding: 10,
    crash_detection: 10
};

export default function SafetyScoreDrawer({ isOpen, onClose, score, recentEvents = [] }) {
    const [showCalculation, setShowCalculation] = useState(true);

    // Calculate raw deductions
    const deductions = {};
    let rawDeducted = 0;

    recentEvents.forEach(event => {
        const penalty = PENALTIES[event.type] || 0;
        if (penalty > 0) {
            deductions[event.type] = (deductions[event.type] || 0) + penalty;
            rawDeducted += penalty;
        }
    });

    const actualScore = score || 100;
    const actualTotalDeducted = Math.max(0, 100 - actualScore);
    const scaleFactor = rawDeducted > 0 ? (actualTotalDeducted / rawDeducted) : 1;

    // FIXED: Extracted nested ternary into a variable for SonarQube
    const scoreColorClass = score >= 80 
        ? 'text-emerald-500' 
        : score >= 50 
            ? 'text-amber-500' 
            : 'text-rose-500';

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998]"
                    />

                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-[9999] overflow-y-auto"
                    >
                        <div className="p-6 pt-10 relative pb-12">
                            
                            <button 
                                onClick={onClose}
                                className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors z-10"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>

                            {/* Current Score Display */}
                            <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-6 mb-6 border border-gray-100 shadow-sm mt-4">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Current Trip Score</p>
                                <div className="flex items-end gap-3">
                                    <span className={`text-6xl font-black tracking-tight ${scoreColorClass}`}>
                                        {score || '--'}
                                    </span>
                                    <span className="text-lg font-medium text-gray-400 mb-2">/ 100</span>
                                </div>
                            </div>

                            <button
                                onClick={() => setShowCalculation(!showCalculation)}
                                className="w-full flex items-center justify-between bg-white border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 p-4 rounded-xl transition-all mb-6 shadow-sm"
                            >
                                <div className="flex items-center gap-2 font-semibold text-gray-800">
                                    <Calculator className="w-5 h-5 text-blue-500" />
                                    {showCalculation ? 'Hide Calculation' : 'View Calculation for this Vehicle'}
                                </div>
                                {showCalculation ? (
                                    <ChevronUp className="w-5 h-5 text-gray-400" />
                                ) : (
                                    <ChevronDown className="w-5 h-5 text-gray-400" />
                                )}
                            </button>

                            <AnimatePresence>
                                {showCalculation && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden mb-8"
                                    >
                                        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                                            <table className="w-full text-sm text-left">
                                                <thead className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase">
                                                    <tr>
                                                        <th className="px-4 py-3 font-medium">Event</th>
                                                        <th className="px-4 py-3 font-medium text-center">Count</th>
                                                        <th className="px-4 py-3 font-medium text-right">Points</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    <tr className="bg-blue-50/30">
                                                        <td className="px-4 py-3 font-semibold text-gray-900">Starting Score</td>
                                                        <td className="px-4 py-3 text-center text-gray-400">—</td>
                                                        <td className="px-4 py-3 text-right font-bold text-emerald-600">100</td>
                                                    </tr>
                                                    
                                                    {Object.entries(deductions).map(([type, rawPts]) => {
                                                        const count = recentEvents.filter(e => e.type === type).length;
                                                        const label = type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                                                        const adjustedPts = Math.round(rawPts * scaleFactor);
                                                        
                                                        return (
                                                            <tr key={type}>
                                                                <td className="px-4 py-3 text-gray-700 flex items-center gap-2">
                                                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                                                                    {label}
                                                                </td>
                                                                <td className="px-4 py-3 text-center text-gray-500">x{count}</td>
                                                                <td className="px-4 py-3 text-right font-mono text-rose-500 font-medium">-{adjustedPts}</td>
                                                            </tr>
                                                        );
                                                    })}

                                                    {actualTotalDeducted === 0 && (
                                                        <tr>
                                                            <td colSpan="3" className="px-4 py-6 text-center text-emerald-600 font-medium bg-emerald-50/30">
                                                                No unsafe events detected. Score remains 100.
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                                <tfoot className="bg-gray-50 border-t border-gray-200">
                                                    <tr>
                                                        <td colSpan="2" className="px-4 py-3 font-bold text-gray-900 text-right">Final Calculated Score</td>
                                                        <td className="px-4 py-3 text-right font-black text-lg text-gray-900">
                                                            {actualScore}
                                                        </td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>
                                        {actualTotalDeducted >= 100 && (
                                            <p className="text-xs text-rose-500 mt-2 text-center font-medium">
                                                * Total deductions reached the maximum floor of 0.
                                            </p>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="space-y-6 mb-8">
                                <div>
                                    <h3 className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-3 uppercase tracking-wide">
                                        <Award className="w-4 h-4 text-blue-500" />
                                        How it is calculated
                                    </h3>
                                    <p className="text-sm text-gray-600 leading-relaxed mb-4">
                                        Every trip starts with a perfect score of <strong>100</strong>. As telemetry streams from the vehicle, our algorithm dynamically deducts points for unsafe driving events.
                                    </p>
                                    
                                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3">
                                        <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                                            <span className="text-sm font-medium text-gray-700">Harsh Braking</span>
                                            <span className="text-sm font-mono font-bold text-rose-500">-5 pts</span>
                                        </div>
                                        <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                                            <span className="text-sm font-medium text-gray-700">Rapid Acceleration</span>
                                            <span className="text-sm font-mono font-bold text-rose-500">-5 pts</span>
                                        </div>
                                        <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                                            <span className="text-sm font-medium text-gray-700">Harsh Cornering</span>
                                            <span className="text-sm font-mono font-bold text-rose-500">-3 pts</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-medium text-gray-700">Speeding (&gt;120km/h)</span>
                                            <span className="text-sm font-mono font-bold text-rose-500">-10 pts</span>
                                        </div>
                                    </div>
                                    
                                    <p className="text-sm text-gray-600 leading-relaxed mt-4">
                                        <strong>Note:</strong> The score floors at 0. Even if a driver accumulates more than 100 points in deductions, the lowest possible score is 0.
                                    </p>
                                </div>

                                <div>
                                    <h3 className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-3 uppercase tracking-wide">
                                        <TrendingUp className="w-4 h-4 text-emerald-500" />
                                        Real-Time Updates
                                    </h3>
                                    <p className="text-sm text-gray-600 leading-relaxed">
                                        This score updates in near real-time (within 5-10 seconds) via our AWS Kinesis stream.
                                    </p>
                                </div>

                                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 flex items-start gap-3">
                                    <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                                    <p className="text-xs text-blue-700 leading-relaxed">
                                        <strong>Predictive Risk:</strong> This score is also fed into our Machine Learning model every night at 03:00 SAST to predict future high-risk driving behaviour.
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={onClose}
                                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors border border-gray-200"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Back to Event Feed
                            </button>

                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
