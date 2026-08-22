

import { useState, useEffect, useRef } from 'react'

import { motion } from 'framer-motion'


import { getVehicleFuelStats } from '../../services/fuelService'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from 'recharts'

import { Fuel, TrendingUp, Download, Award, Calendar, Leaf, Gauge, Coins, TrendingDown, BarChart3, PieChart as PieChartIcon, X, Info, Zap } from 'lucide-react'



const containerVariants = {

  hidden: { opacity: 0 },

  visible: {

    opacity: 1,

    transition: { staggerChildren: 0.06, delayChildren: 0.1 }

  }

}



const itemVariants = {

  hidden: { opacity: 0, y: 20 },

  visible: { opacity: 1, y: 0 }

}



const cardVariants = {

  hidden: { opacity: 0, scale: 0.96 },

  visible: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 25 } }

}



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

}



function AnimatedCounter({ value, suffix = '', prefix = '', duration = 1200 }) {

  const [count, setCount] = useState(0)

  const [isVisible, setIsVisible] = useState(false)

  const ref = useRef(null)


  
  useEffect(() => {
  
    const observer = new IntersectionObserver(
  
      ([entry]) => {
  
        if (entry.isIntersecting) {
  
          setIsVisible(true)
  
          observer.disconnect()
  
        }
  
      },
  
      { threshold: 0.1 }
  
    )
  
    if (ref.current) observer.observe(ref.current)
  
      return () => observer.disconnect()
  
    }, [])

    
 
 
    useEffect(() => {
 
 
      if (!isVisible) return
 
      let start = 0
 
      const step = value / (duration / 16)
 
      const timer = setInterval(() => {
 
        start += step
 
        if (start >= value) {
 
          setCount(value)
 
          clearInterval(timer)
 
        } else {
 
          setCount(Math.round(start * 10) / 10)
 
        }
    }, 16)
 
 
 
    return () => clearInterval(timer)
 
  }, [isVisible, value, duration])


    
  return <span ref={ref}>{prefix}{count}{suffix}</span>
}









function StatCard({ label, value, suffix = '', icon: Icon, color = '#1a1a2e', trend = null, delay = 0, onClick = null }) {

  return (

    <motion.div

    variants={cardVariants}

    transition={{ delay }}

    onClick={onClick}

    className={`relative overflow-hidden bg-white rounded-2xl p-6 shadow-[0_2px_20px_rgba(0,0,0,0.04)] border border-gray-100/80 hover:shadow-[0_8px_40px_rgba(0,0,0,0.08)] transition-all duration-500 group ${onClick ? 'cursor-pointer' : ''}`}


>

      <div className="absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 rounded-full bg-gradient-to-br from-gray-50 to-transparent opacity-30 group-hover:scale-150 transition-transform duration-700" />

      <div className="relative z-10 flex items-start justify-between">

        <div>

          <p className="text-[11px] font-medium text-gray-400 uppercase tracking-[0.08em]">{label}</p>

          <p className="text-2xl font-bold text-gray-900 mt-1.5 tracking-tight">

            <AnimatedCounter value={value} suffix={suffix} />

          </p>

          {trend && (

<p className={`text-xs mt-1.5 flex items-center gap-1 ${trend > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>

              {trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}

              {Math.abs(trend)}% from last period

            </p>

)}

        </div>

        <div className="p-3 rounded-xl bg-gray-50 group-hover:bg-gray-100 transition-colors duration-300">

          <Icon className="w-4 h-4 text-gray-700" />

        </div>

      </div>

      {onClick && (

<div className="absolute bottom-2 right-3 opacity-0 group-hover:opacity-100 transition-opacity">

          <Info className="w-3.5 h-3.5 text-gray-400" />

        </div>

)}

    </motion.div>

)

}



function EfficiencyGauge({ value, max = 20 }) {

  const percentage = Math.min((value / max) * 100, 100)

  const color = percentage > 70 ? '#10B981' : percentage > 40 ? '#F59E0B' : '#EF4444'


  
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
  )
}







function EmissionsCard({ fuelUsed }) {

  const co2PerLiter = 2.31

  const totalCO2 = fuelUsed * co2PerLiter

  if (fuelUsed <= 0) return null


  
  return (
  
    <motion.div
  
    initial={{ opacity: 0, y: 20 }}
  
    animate={{ opacity: 1, y: 0 }}
  
    transition={{ delay: 0.3 }}
  
    className="relative overflow-hidden bg-white rounded-2xl p-6 shadow-[0_2px_20px_rgba(0,0,0,0.04)] border border-gray-100/80 hover:shadow-[0_8px_40px_rgba(0,0,0,0.08)] transition-all duration-500 group"
  
  >
  
      <div className="absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 rounded-full bg-gradient-to-br from-gray-50 to-transparent opacity-30 group-hover:scale-150 transition-transform duration-700" />
  
      <div className="relative z-10">
  
        <div className="flex items-center justify-between">
  
          <div className="flex items-center gap-2.5">
  
            <div className="p-2 rounded-lg bg-gray-50 group-hover:bg-gray-100 transition-colors duration-300">
  
              <Leaf className="w-4 h-4 text-gray-700" />
  
            </div>
  
            <span className="text-[10px] font-medium text-gray-400 uppercase tracking-[0.1em]">Carbon Impact</span>
  
          </div>
  
        </div>
  
        <p className="text-3xl font-bold text-gray-900 tracking-tight mt-3">
  
          {totalCO2.toFixed(1)}
  
          <span className="text-sm font-normal text-gray-400 ml-1.5">kg CO2</span>
  
        </p>
  
        <p className="text-sm text-gray-500 mt-0.5">From {fuelUsed.toFixed(1)}L fuel consumed</p>
  
        <div className="mt-3.5 flex items-center gap-2">
  
          <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
  
            Offsets ~{Math.round(totalCO2 * 0.5)} trees/year
  
          </span>
  
        </div>
  
      </div>
  
    </motion.div>
  
)

}






function SavingsCard({ currentEfficiency, targetEfficiency = 12, distance = 1000 }) {

  const currentFuel = distance / currentEfficiency

  const targetFuel = distance / targetEfficiency

  const savings = currentFuel - targetFuel

  const savingsPercent = ((savings / currentFuel) * 100).toFixed(0)


  
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
    )
  }





  
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
  
)
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
  
      <div className="mt-3">
  
        <div className="flex items-center gap-3">
  
          <div className="flex-1 h-1.5 bg-emerald-200 rounded-full overflow-hidden">
  
            <motion.div
  
  initial={{ width: 0 }}
  
  animate={{ width: `${savingsPercent}%` }}
  
  transition={{ delay: 0.6, duration: 1 }}
  
  className="h-full bg-emerald-500 rounded-full"
  
  />
  
          </div>
  
          <span className="text-xs font-medium text-emerald-600">{savingsPercent}%</span>
  
        </div>
  
      </div>
  
    </motion.div>
  )
}






function BestWorstTrips({ trips }) {

  if (!trips || trips.length < 2) return null

  const sorted = [...trips].sort((a, b) => parseFloat(b.fuel_efficiency_km_per_liter) - parseFloat(a.fuel_efficiency_km_per_liter))

  const best = sorted[0]

  const worst = sorted[sorted.length - 1]

  const bestEff = parseFloat(best.fuel_efficiency_km_per_liter) || 0

  const worstEff = parseFloat(worst.fuel_efficiency_km_per_liter) || 0

  if (bestEff === 0 && worstEff === 0) return null


  
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
  
)
}







function SafetyEfficiencyComparison({ safetyScore, efficiency, vehicleId }) {

  if (!safetyScore && safetyScore !== 0) return null


  
  const getEfficiencyRating = (eff) => {
  
    if (eff > 12) return { label: 'Excellent', color: 'text-emerald-600', bg: 'bg-emerald-50' }
  
    if (eff > 8) return { label: 'Good', color: 'text-amber-600', bg: 'bg-amber-50' }
  
    return { label: 'Needs Work', color: 'text-rose-600', bg: 'bg-rose-50' }
  
  }





  
  const getSafetyRating = (score) => {
  
    if (score >= 80) return { label: 'Good', color: 'text-emerald-600', bg: 'bg-emerald-50' }
  
    if (score >= 50) return { label: 'Fair', color: 'text-amber-600', bg: 'bg-amber-50' }
  
    return { label: 'Poor', color: 'text-rose-600', bg: 'bg-rose-50' }
  }

  
  
  
  const effRating = getEfficiencyRating(efficiency)
  
  const safeRating = getSafetyRating(safetyScore)


  
  return (
  
    <motion.div
  
    initial={{ opacity: 0, y: 20 }}
  
    animate={{ opacity: 1, y: 0 }}
  
    transition={{ delay: 0.45 }}
  
    className="bg-white rounded-2xl p-5 shadow-[0_2px_20px_rgba(0,0,0,0.04)] border border-gray-100/80"
  
  >
  
      <div className="flex items-center gap-2.5 mb-3">
  
        <div className="p-1.5 rounded-lg bg-gray-100">
  
          <TrendingUp className="w-3.5 h-3.5 text-gray-600" />
  
        </div>
  
        <span className="text-[10px] font-medium text-gray-400 uppercase tracking-[0.08em]">Safety vs Efficiency</span>
  
        <span className="text-[10px] text-gray-400 ml-auto">Vehicle {vehicleId}</span>
      </div>
  
      <div className="grid grid-cols-2 gap-4">
  
        <div className={`p-4 rounded-xl ${effRating.bg} border border-gray-100/50`}>
  
          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-[0.08em]">Fuel Efficiency</p>
  
          <p className="text-xl font-bold text-gray-900">{efficiency.toFixed(1)} <span className="text-sm font-normal text-gray-500">km/L</span></p>
  
          <p className={`text-xs font-medium ${effRating.color}`}>{effRating.label}</p>
  
        </div>
  
        <div className={`p-4 rounded-xl ${safeRating.bg} border border-gray-100/50`}>
  
          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-[0.08em]">Safety Score</p>
  
          <p className="text-xl font-bold text-gray-900">{safetyScore.toFixed(0)} <span className="text-sm font-normal text-gray-500">/100</span></p>
  
  
          <p className={`text-xs font-medium ${safeRating.color}`}>{safeRating.label}</p>
  
        </div>
  
      </div>
  
      <div className="mt-3 text-center">
  
        <p className="text-xs text-gray-400">
  
          {efficiency > 12 && safetyScore >= 80 ? 'Both efficiency and safety are excellent' :
  
  efficiency > 12 && safetyScore < 80 ? 'Good efficiency, safety needs attention' :
  
  efficiency <= 12 && safetyScore >= 80 ? 'Good safety, efficiency needs improvement' :
  
  'Both efficiency and safety need work'}
  
        </p>
  
      </div>
  
    </motion.div>
  )
}






function EfficiencyBreakdownModal({ isOpen, onClose, roadData, avgEfficiency }) {

  if (!isOpen) return null


  
  const sortedRoads = roadData ? [...roadData].sort((a, b) => b.value - a.value) : []


  
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
  
          <button
  
  onClick={onClose}
  
  className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
  
  >
  
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



          {sortedRoads.length > 0 && (

<div className="bg-gray-50 rounded-xl p-4">

              <p className="text-xs font-medium text-gray-400 uppercase tracking-[0.08em] mb-3">Your Distance by Road Type</p>

              <div className="space-y-2">


                {sortedRoads.map((item) => (

<div key={item.name} className="flex items-center gap-3">

                    <span className="text-sm text-gray-600 capitalize w-24">{item.name.replace('_', ' ')}</span>

                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">

                      <div


className="h-full bg-gray-800 rounded-full"
                        style={{ width: `${Math.min((item.value / sortedRoads[0].value) * 100, 100)}%` }}

/>

                    </div>

                    <span className="text-sm font-medium text-gray-900 w-16 text-right">{item.value} km</span>

                  </div>

))}

              </div>

            </div>
          )}



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
  )
}







export default function VehicleFuelTab({ vehicleId }) {

  const [data, setData] = useState(null)

  const [loading, setLoading] = useState(true)

  const [days, setDays] = useState(30)

  const [showBreakdownModal, setShowBreakdownModal] = useState(false)


  
  useEffect(() => {
  
    async function fetchData() {
  
      setLoading(true)
  
      try {
  
        const result = await getVehicleFuelStats(vehicleId, days)
  
        setData(result)
  
      } catch (err) {
  
        console.error('Failed to fetch fuel data:', err)
  
      } finally {
  
        setLoading(false)
  
      }
  
    }
  
    fetchData()
  
  }, [vehicleId, days])




  
  const handleExport = () => {
  
    if (!data) return
  
    const headers = ['Date', 'Distance (km)', 'Fuel (L)', 'Efficiency (km/L)']
  
    const rows = data.trips.map(t => [
  
      new Date(t.trip_date).toLocaleDateString(),
  
      parseFloat(t.total_distance_km).toFixed(1),
  
      parseFloat(t.estimated_fuel_consumed_liters).toFixed(1),
  
      parseFloat(t.fuel_efficiency_km_per_liter).toFixed(1)
  
    ])
  
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
  
    const blob = new Blob([csv], { type: 'text/csv' })
  
    const url = URL.createObjectURL(blob)
  
    const a = document.createElement('a')
  
    a.href = url
  
    a.download = `fuel-efficiency-${vehicleId}.csv`
  
    a.click()
  
    URL.revokeObjectURL(url)
  
  }

  
  
  
  
  if (loading) {
  
    return (
  
  <div className="flex items-center justify-center h-64">
  
  
        <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
      </div>
  
)

}






if (!data || data.trips.length === 0) {

  return (

<div className="flex items-center justify-center h-64">

        <p className="text-gray-400">No fuel data available for this vehicle</p>

      </div>

)

}






const roadData = data.summary.road_breakdown ?

Object.entries(data.summary.road_breakdown).map(([road, dist]) => ({


  name: road,

  value: Math.round(dist)

})) : []



const tripChartData = data.trips.slice(0, 20).map(trip => ({

  date: new Date(trip.trip_date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' }),

  efficiency: parseFloat(trip.fuel_efficiency_km_per_liter) || 0,

  fuel: parseFloat(trip.estimated_fuel_consumed_liters) || 0,

  distance: parseFloat(trip.total_distance_km) || 0

})).reverse()



const totalDistance = Math.round(data.summary.total_distance)

const totalFuel = Math.round(data.summary.total_fuel)

const COLORS = ['#1a1a2e', '#4a4a6a', '#8a8aaa', '#c0c0d0']



const maxEff = data.trips.length > 0 ? Math.max(...data.trips.map(t => parseFloat(t.fuel_efficiency_km_per_liter) || 0)) : 0

const minEff = data.trips.length > 0 ? Math.min(...data.trips.map(t => parseFloat(t.fuel_efficiency_km_per_liter) || 0)) : 0



return (

  <motion.div

  variants={containerVariants}

  initial="hidden"

  animate="visible"

  className="space-y-5"

>
      <EfficiencyBreakdownModal

isOpen={showBreakdownModal}
        onClose={() => setShowBreakdownModal(false)}

        roadData={roadData}

        avgEfficiency={data.summary.avg_efficiency}

/>



      <motion.div variants={itemVariants} className="flex items-center justify-between">

        <div className="flex items-center gap-4">

          <div className="p-3 rounded-2xl bg-gray-900 shadow-lg shadow-gray-900/20">

            <Fuel className="w-5 h-5 text-white" />

          </div>

          <div>

            <h3 className="text-lg font-bold text-gray-900 tracking-tight">Fuel Efficiency</h3>

            <p className="text-sm text-gray-400">Vehicle {vehicleId} · {data.summary.trip_count} trips · {days} days</p>

          </div>

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



      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-4">

        <motion.div

initial={{ opacity: 0, y: 20 }}

animate={{ opacity: 1, y: 0 }}

transition={{ delay: 0.4 }}

className="bg-white rounded-2xl p-5 shadow-[0_2px_20px_rgba(0,0,0,0.04)] border border-gray-100/80"

>

          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-[0.08em] mb-3">Monthly Summary</p>

          <div className="grid grid-cols-3 gap-2 text-center">

            <div>

              <p className="text-lg font-bold text-gray-900">{totalDistance}</p>

              <p className="text-[10px] text-gray-400">km</p>

            </div>

            <div>

              <p className="text-lg font-bold text-gray-900">{totalFuel}</p>

              <p className="text-[10px] text-gray-400">L</p>

            </div>

            <div>

              <p className="text-lg font-bold text-gray-900">{data.summary.trip_count}</p>
              <p className="text-[10px] text-gray-400">trips</p>

            </div>

          </div>


        </motion.div>

        <div className="md:col-span-2">
          <BestWorstTrips trips={data.trips} />

        </div>

      </motion.div>



      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-4">

        <div className="md:col-span-2">

          <SafetyEfficiencyComparison 

safetyScore={data.summary.avg_safety_score} 

efficiency={data.summary.avg_efficiency} 

vehicleId={vehicleId} 

/>

        </div>

      </motion.div>



      <motion.div variants={itemVariants} className="flex items-center gap-3">

        <select

value={days}

onChange={(e) => setDays(parseInt(e.target.value))}

className="text-sm border border-gray-200 rounded-xl px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/20 transition-all"

>

          <option value={7}>7 Days</option>

          <option value={30}>30 Days</option>

          <option value={90}>90 Days</option>

        </select>

        <span className="text-xs text-gray-400 ml-auto">{data.trips.length} trips</span>

      </motion.div>



      {roadData.length > 0 && (

<motion.div

initial={{ opacity: 0, y: 20 }}

animate={{ opacity: 1, y: 0 }}

transition={{ delay: 0.5 }}

className="grid grid-cols-1 lg:grid-cols-2 gap-4"
        >
          <div className="bg-white rounded-2xl p-5 shadow-[0_2px_20px_rgba(0,0,0,0.04)] border border-gray-100/80">



            <div className="flex items-center gap-2.5 mb-3.5">


              <BarChart3 className="w-4 h-4 text-gray-400" />

              <span className="text-xs font-medium text-gray-400 uppercase tracking-[0.08em]">Road Breakdown</span>

            </div>

            <ResponsiveContainer width="100%" height={160}>

              <BarChart data={roadData} layout="vertical">

                <XAxis type="number" hide />

                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#9CA3AF' }} width={60} />

                <Tooltip

contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontSize: 12 }}

/>

                <Bar dataKey="value" fill="#1a1a2e" radius={[0, 6, 6, 0]} />

              </BarChart>

            </ResponsiveContainer>

          </div>



          <div className="bg-white rounded-2xl p-5 shadow-[0_2px_20px_rgba(0,0,0,0.04)] border border-gray-100/80">

            <div className="flex items-center gap-2.5 mb-3.5">

              <PieChartIcon className="w-4 h-4 text-gray-400" />

              <span className="text-xs font-medium text-gray-400 uppercase tracking-[0.08em]">Distance Distribution</span>

            </div>

            <ResponsiveContainer width="100%" height={160}>

              <PieChart>

                <Pie

data={roadData}

dataKey="value"

cx="50%"

cy="50%"

innerRadius={40}

outerRadius={60}
                  paddingAngle={2}



>

                  {roadData.map((entry, index) => (

<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />

))}

                </Pie>

                <Tooltip

contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontSize: 12 }}

/>

              </PieChart>

            </ResponsiveContainer>

          </div>

        </motion.div>

)}



      <motion.div

initial={{ opacity: 0, y: 20 }}

animate={{ opacity: 1, y: 0 }}

transition={{ delay: 0.6 }}

className="bg-white rounded-2xl p-5 shadow-[0_2px_20px_rgba(0,0,0,0.04)] border border-gray-100/80"

>

        <div className="flex items-center justify-between mb-3.5">

          <div className="flex items-center gap-2.5">

            <TrendingUp className="w-4 h-4 text-gray-400" />

            <span className="text-xs font-medium text-gray-400 uppercase tracking-[0.08em]">Efficiency Trend</span>

          </div>

        </div>

        <ResponsiveContainer width="100%" height={200}>

          <AreaChart data={tripChartData}>

            <defs>

              <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">

                <stop offset="5%" stopColor="#1a1a2e" stopOpacity={0.12} />

                <stop offset="95%" stopColor="#1a1a2e" stopOpacity={0} />

              </linearGradient>

            </defs>

            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9CA3AF' }} />

            <YAxis domain={[0, 'auto']} tick={{ fontSize: 10, fill: '#9CA3AF' }} />

            <Tooltip

contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontSize: 12 }}

/>

            <Area type="monotone" dataKey="efficiency" stroke="#1a1a2e" strokeWidth={2.5} fill="url(#trendGradient)" />

          </AreaChart>

        </ResponsiveContainer>

      </motion.div>



      <motion.div

initial={{ opacity: 0, y: 20 }}

animate={{ opacity: 1, y: 0 }}

transition={{ delay: 0.7 }}

className="bg-white rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] border border-gray-100/80 overflow-hidden"

>

        <div className="p-5 border-b border-gray-50 flex items-center justify-between">

          <span className="text-xs font-medium text-gray-400 uppercase tracking-[0.08em]">Recent Trips</span>

          <span className="text-[10px] text-gray-400">

            <span className="inline-block w-3 h-3 rounded-full bg-emerald-100 border border-emerald-300 mr-1 align-middle"></span>

            Best

            <span className="mx-2">|</span>

            <span className="inline-block w-3 h-3 rounded-full bg-rose-100 border border-rose-300 mr-1 align-middle"></span>

            Lowest

          </span>

        </div>

        <div className="overflow-x-auto">

          <table className="w-full text-sm">

            <thead>

              <tr className="border-b border-gray-50">

                <th className="text-left py-3 px-5 text-[10px] font-medium text-gray-400 uppercase tracking-[0.08em]">Date</th>

                <th className="text-right py-3 px-5 text-[10px] font-medium text-gray-400 uppercase tracking-[0.08em]">Distance</th>

                <th className="text-right py-3 px-5 text-[10px] font-medium text-gray-400 uppercase tracking-[0.08em]">Fuel</th>

                <th className="text-right py-3 px-5 text-[10px] font-medium text-gray-400 uppercase tracking-[0.08em]">Efficiency</th>

              </tr>

            </thead>

            <tbody>

              {data.trips.slice(0, 10).map((trip, i) => {

const eff = parseFloat(trip.fuel_efficiency_km_per_liter) || 0

const isBest = eff === maxEff && maxEff > 0

const isLowest = eff === minEff && minEff > 0 && eff !== maxEff

const color = eff > 12 ? 'bg-emerald-50 text-emerald-600' : eff > 8 ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'

const highlightClass = isBest ? 'bg-emerald-100/50 border-l-4 border-emerald-500' :

isLowest ? 'bg-rose-100/50 border-l-4 border-rose-500' :

''

return (

  <motion.tr

  key={i}

  initial={{ opacity: 0 }}

  animate={{ opacity: 1 }}

  transition={{ delay: 0.05 * i }}

  className={`border-b border-gray-50/50 hover:bg-gray-50/30 transition-colors ${highlightClass}`}

>

                    <td className="py-3 px-5 text-gray-700 text-sm">

                      {new Date(trip.trip_date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}

                    </td>

                    <td className="text-right py-3 px-5 text-gray-700 text-sm">

                      {parseFloat(trip.total_distance_km).toFixed(1)} km

                    </td>

                    <td className="text-right py-3 px-5 text-gray-700 text-sm">

                      {parseFloat(trip.estimated_fuel_consumed_liters).toFixed(1)} L

                    </td>

                    <td className="text-right py-3 px-5">

                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${color}`}>

                        {eff.toFixed(1)} km/L

                        {isBest && ' Best'}

                        {isLowest && ' Lowest'}

                      </span>

                    </td>

                  </motion.tr>

)

})}

            </tbody>

          </table>

        </div>

      </motion.div>

    </motion.div>

)

}

