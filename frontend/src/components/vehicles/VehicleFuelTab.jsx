/* NOSONAR */

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'


import { getVehicleFuelStats } from '../../services/fuelService'

import {

  ComposedChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,

  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar as RadarSeries

} from 'recharts'

import {

  Fuel, TrendingUp, Download, Award, Calendar, Leaf, Gauge, Coins,

  TrendingDown, X, Info, Zap, Radar as RadarIcon, HelpCircle


} from 'lucide-react'



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



const WEEKDAY_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const ROSE_COLORS = ['#34d399', '#a78bfa', '#38bdf8', '#fbbf24', '#f472b6', '#fb7185', '#22d3ee', '#facc15']



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
  
    if (ref.current) {
      observer.observe(ref.current)
    }
  
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






function MiniSparkline({ data, color = '#1a1a2e' }) {

  if (!data || data.length < 2) return null

  const w = 68, h = 24

  const min = Math.min(...data)

  const max = Math.max(...data)

  const range = max - min || 1

  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(' ')

  const areaPoints = `0,${h} ${points} ${w},${h}`

  const lastY = h - ((data.at(-1) - min) / range) * h


  
  return (
  
  <svg width={w} height={h} className="overflow-visible mt-2">
  
      <polyline points={areaPoints} fill={color} fillOpacity={0.1} stroke="none" />
  
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
  
      <circle cx={w} cy={lastY} r={2.5} fill={color} />
  
    </svg>
  
)
}





function StatCard({ label, value, suffix = '', icon: Icon, trend = null, delay = 0, onClick = null, spark = null, sparkColor = '#1a1a2e' }) {

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

          {spark && <MiniSparkline data={spark} color={sparkColor} />}

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

  const sorted = [...trips].sort((a, b) => Number.parseFloat(b.fuel_efficiency_km_per_liter) - Number.parseFloat(a.fuel_efficiency_km_per_liter))

  const best = sorted[0]

  const worst = sorted[sorted.length - 1]

  const bestEff = Number.parseFloat(best.fuel_efficiency_km_per_liter) || 0

  const worstEff = Number.parseFloat(worst.fuel_efficiency_km_per_liter) || 0

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





function WeeklyEfficiencyRadar({ radarData, bestDay }) {

  if (!radarData || radarData.every(d => d.efficiency === 0)) return null


  
  return (
  
    <motion.div
  
    initial={{ opacity: 0, y: 20 }}
  
    animate={{ opacity: 1, y: 0 }}
  
    transition={{ delay: 0.42 }}
  
    className="bg-white rounded-2xl p-6 shadow-[0_2px_20px_rgba(0,0,0,0.04)] border border-gray-100/80"
  
  >
  
      <div className="flex items-center justify-between mb-1">
  
  
        <div className="flex items-center gap-2.5">
  
  
          <div className="p-2 rounded-lg bg-gray-50">
  
            <RadarIcon className="w-4 h-4 text-gray-700" />
  
          </div>
  
          <span className="text-sm font-medium text-gray-700">Weekly Efficiency Rhythm</span>
  
        </div>
  
        {bestDay && (
  
  <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
  
            Best: {bestDay}
  
          </span>
  
  )}
  
      </div>
  
      <ResponsiveContainer width="100%" height={230}>
  
        <RadarChart data={radarData} outerRadius="72%">
  
          <PolarGrid stroke="#E5E7EB" />
  
          <PolarAngleAxis dataKey="day" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
  
          <PolarRadiusAxis angle={90} tick={{ fontSize: 9, fill: '#D1D5DB' }} axisLine={false} />
  
          <RadarSeries
  
  name="Vehicle avg"
  
  dataKey="benchmark"
  
  stroke="#D1D5DB"
  
  fill="#D1D5DB"
  
  fillOpacity={0.15}
  
  strokeWidth={1.5}
  
  strokeDasharray="4 3"
  
  />
  
          <RadarSeries
  
  name="Daily avg"
  
  dataKey="efficiency"
  
  stroke="#10B981"
  
  fill="#10B981"
  
  fillOpacity={0.35}
  
  strokeWidth={2.5}
  
  animationDuration={900}
  
  />
  
          <Tooltip
  
  contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontSize: 12 }}
  
  formatter={(v) => `${v} km/L`}
  
  />
  
        </RadarChart>
  
      </ResponsiveContainer>
  
      <div className="flex items-center justify-center gap-5 mt-1">
  
        <span className="flex items-center gap-1.5 text-[10px] text-gray-400">
  
          <span className="w-2 h-2 rounded-full bg-emerald-500" />Daily avg
  
        </span>
  
        <span className="flex items-center gap-1.5 text-[10px] text-gray-400">
  
          <span className="w-2 h-2 rounded-full bg-gray-300 border border-dashed border-gray-400" />Vehicle avg
  
  
        </span>
  
      </div>
    </motion.div>
  )
}





function GlobePlaceholder({ totalDistance, onInfoClick }) {

  return (

    <motion.div

    initial={{ opacity: 0 }}

    animate={{ opacity: 1 }}

    transition={{ duration: 0.8 }}

    className="relative overflow-hidden bg-gradient-to-br from-[#f8fafc] to-[#f1f5f9] rounded-2xl p-6 border border-gray-200/80 h-[380px] flex items-center justify-center cursor-pointer group hover:border-gray-300/80 transition-all duration-500 shadow-[0_2px_20px_rgba(0,0,0,0.04)]"

    onClick={onInfoClick}


>


      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-t from-emerald-100/30 via-transparent to-transparent pointer-events-none" />


      <div className="relative w-48 h-48">

        <motion.div
          className="absolute inset-0 rounded-full border-2 border-gray-200"

          animate={{ rotate: 360 }}


          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}

>


          <div className="absolute inset-0 rounded-full border border-gray-100" />
          <div className="absolute inset-0 flex items-center justify-center">


            <div className="w-3/4 h-px bg-gray-200" />

          </div>

          <div className="absolute inset-0 flex items-center justify-center">

            <div className="w-1/2 h-px bg-gray-200 translate-y-8" />

          </div>

          <div className="absolute inset-0 flex items-center justify-center">

            <div className="w-1/2 h-px bg-gray-200 -translate-y-8" />

          </div>

          <div className="absolute inset-0 flex items-center justify-center">

            <div className="w-px h-3/4 bg-gray-200" />

          </div>

          <div className="absolute inset-0 flex items-center justify-center">

            <div className="w-px h-1/2 bg-gray-200 translate-x-8" />

          </div>

          <div className="absolute inset-0 flex items-center justify-center">

            <div className="w-px h-1/2 bg-gray-200 -translate-x-8" />

          </div>

        </motion.div>

        {['#34d399', '#a78bfa', '#38bdf8', '#fbbf24', '#f472b6'].map((color, i) => (

<motion.div

key={trip.trip_id || `trip-${i}`}

className="absolute rounded-full border-2"

style={{

  borderColor: color,

  opacity: 0.3,

  left: `${15 + i * 5}%`,

  top: `${15 + i * 5}%`,

  width: `${70 - i * 8}%`,

  height: `${70 - i * 8}%`,

}}


animate={{

  scale: [1, 1.3, 1],

  opacity: [0.3, 0, 0.3],

}}
            transition={{
              duration: 3,


              repeat: Infinity,


              delay: i * 0.5,

              ease: 'easeInOut',

            }}

            />

))}

        <div className="absolute inset-0 flex items-center justify-center">

          <span className="text-4xl">🚛</span>

        </div>

      </div>

      <div className="absolute bottom-8 text-center">

        <p className="text-sm font-medium text-gray-800">Mapping road network...</p>

        <p className="text-xs text-gray-500">{totalDistance || 0} km tracked</p>

        <motion.p

className="text-sm font-medium text-gray-700 mt-2"

animate={{ opacity: [0.5, 1, 0.5] }}

transition={{ duration: 2, repeat: Infinity }}

>

          Click for fuel info

        </motion.p>

      </div>

    </motion.div>

)
}







function FuelInfoModal({ isOpen, onClose, avgEfficiency }) {

  if (!isOpen) return null


  
  return (
  
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
  
      <motion.div
  
  initial={{ opacity: 0, scale: 0.9 }}
  
  animate={{ opacity: 1, scale: 1 }}
  
  exit={{ opacity: 0, scale: 0.9 }}
  
  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
  
  className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-8 shadow-2xl m-4"
  
  onClick={(e) => e.stopPropagation()}
  
  >
  
        <div className="flex items-center justify-between mb-6">
  
          <div className="flex items-center gap-3">
  
            <div className="p-2.5 rounded-xl bg-gray-900">
  
              <Fuel className="w-5 h-5 text-white" />
  
            </div>
  
            <div>
  
              <h2 className="text-xl font-bold text-gray-900">Efficiency Breakdown</h2>
  
              <p className="text-sm text-gray-500">Average: {avgEfficiency || 0} km/L</p>
  
            </div>
  
          </div>
  
          <button
  
  type="button"
  
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
  
          <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200/50">
  
            <p className="text-xs font-medium text-emerald-600 uppercase tracking-[0.08em]">How It's Calculated</p>
  
  
            <p className="text-sm text-gray-700 mt-1 font-medium">
  
              Fuel consumed = (Distance / 100) × Fuel Rate × Speed Factor
  
            </p>
  
            <p className="text-xs text-gray-500 mt-1">
  
              Speed factor adjusts for optimal efficiency at 55-65 km/h
  
            </p>
  
          </div>
  
          <div className="bg-gray-50 rounded-xl p-4">
  
            <p className="text-xs font-medium text-gray-400 uppercase tracking-[0.08em]">What is Fuel Efficiency?</p>
  
            <p className="text-sm text-gray-600 mt-1 leading-relaxed">
  
              Fuel efficiency measures how far a vehicle can travel on a given amount of fuel.
  
              Higher km/L means better efficiency, lower costs, and reduced emissions.
  
            </p>
  
          </div>
  
          <div className="bg-gray-50 rounded-xl p-4">
  
            <p className="text-xs font-medium text-gray-400 uppercase tracking-[0.08em]">Why It Matters</p>
  
            <div className="grid grid-cols-3 gap-3 mt-2">
  
              <div className="bg-white rounded-lg p-3 text-center border border-gray-100">
  
                <p className="text-xs font-semibold text-gray-700">Lower Costs</p>
  
              </div>
  
              <div className="bg-white rounded-lg p-3 text-center border border-gray-100">
  
                <p className="text-xs font-semibold text-gray-700">Lower Emissions</p>
  
              </div>
  
              <div className="bg-white rounded-lg p-3 text-center border border-gray-100">
  
                <p className="text-xs font-semibold text-gray-700">Better Performance</p>
  
              </div>
  
            </div>
  
          </div>
  
        </div>
  
        <button
  
  type="button"
  
  onClick={onClose}
  
  className="w-full mt-6 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors text-sm font-medium"
  
  >
  
          Got it
  
        </button>
  
      </motion.div>
  
    </div>
  
)
}






function RoadDominanceRose({ data, totalDistance }) {

  const [showInfoModal, setShowInfoModal] = useState(false)

  const size = 300

  const cx = size / 2

  const cy = size / 2

  const maxR = size / 2 - 46

  const minR = 22


  
  if (!data || data.length === 0) {
  
    return (
  
  <>
  
        <GlobePlaceholder
  
  totalDistance={totalDistance}
  
  
  onInfoClick={() => setShowInfoModal(true)}
        />
  
        <FuelInfoModal
  
  isOpen={showInfoModal}
  
  onClose={() => setShowInfoModal(false)}
  
  avgEfficiency={0}
  
  />
  
      </>
  
)
  }




  const avgEfficiency = data.reduce((sum, d) => sum + d.value, 0) / data.length / 10 || 0



  
  const maxValue = Math.max(...data.map(d => d.value)) || 1
  
  const total = data.reduce((s, d) => s + d.value, 0) || 1
  
  const n = data.length
  
  const angleStep = 360 / n
  
  const gap = n > 6 ? 3 : 5


  
  const toXY = (r, angleDeg) => {
  
    const rad = (angleDeg - 90) * Math.PI / 180
  
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
  
  }

  
  return (
  
  <>
  
      <motion.div
  
  initial={{ opacity: 0, y: 20 }}
  
  animate={{ opacity: 1, y: 0 }}
  
  transition={{ delay: 0.46 }}
  
  className="relative overflow-hidden bg-gradient-to-br from-[#0b0f1a] to-[#141a2b] rounded-2xl p-6 border border-white/5 shadow-[0_8px_40px_rgba(0,0,0,0.35)]"
  
  >
  
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(52,211,153,0.08),transparent_60%)]" />
  
        <div className="relative z-10 flex items-center justify-between mb-1">
  
          <div className="flex items-center gap-2.5">
  
  
            <span className="relative flex h-2 w-2">
  
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
  
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
  
            </span>
  
  
            <span className="text-sm font-medium text-gray-100">Road Dominance</span>
  
          </div>
  
          <span className="text-[10px] text-gray-500 uppercase tracking-[0.08em]">{totalDistance} km total</span>
  
        </div>
  
        <p className="relative z-10 text-[11px] text-gray-500 mb-2">Distance share by road type</p>
  
        <div className="relative z-10 flex items-center justify-center">
  
          <svg viewBox={`0 0 ${size} ${size}`} width="100%" style={{ maxWidth: 340 }}>
  
            {[0.34, 0.67, 1].map((f, i) => (
  
  <circle
  
  key={trip.trip_id || `trip-${i}`}
  
  cx={cx}
  
  cy={cy}
  
  r={minR + (maxR - minR) * f}
  
  fill="none"
  
  stroke="rgba(255,255,255,0.06)"
  
  strokeDasharray="3 4"
  
  />
  
  ))}
  
            {data.map((d, i) => {
  
  const rOuter = minR + (d.value / maxValue) * (maxR - minR)
  
  const start = i * angleStep + gap / 2
  
  const end = (i + 1) * angleStep - gap / 2
  
  const p1 = toXY(rOuter, start)
  
  const p2 = toXY(rOuter, end)
  
  const large = end - start > 180 ? 1 : 0
  
  const path = `M ${cx},${cy} L ${p1.x.toFixed(2)},${p1.y.toFixed(2)} A ${rOuter.toFixed(2)} ${rOuter.toFixed(2)} 0 ${large} 1 ${p2.x.toFixed(2)},${p2.y.toFixed(2)} Z`
  
  const color = ROSE_COLORS[i % ROSE_COLORS.length]
  
  const mid = start + (end - start) / 2
  
  
  const labelPos = toXY(rOuter + 16, mid)
  
  const cosVal = Math.cos((mid - 90) * Math.PI / 180)
  
  const anchor = cosVal > 0.25 ? 'start' : cosVal < -0.25 ? 'end' : 'middle'
  
  const pct = (d.value / total) * 100
  
  return (
  
  <g key={d.name}>
  
                  <motion.path
  
  d={path}
  
  fill={color}
  
  fillOpacity={0.5}
  
  stroke={color}
  
  strokeWidth={1.5}
  
  initial={{ scale: 0, opacity: 0 }}
  
  animate={{ scale: 1, opacity: 1 }}
  
  whileHover={{ fillOpacity: 0.8 }}
  
  transition={{ delay: 0.5 + i * 0.08, type: 'spring', stiffness: 140, damping: 16 }}
  
  style={{ transformOrigin: `${cx}px ${cy}px`, filter: `drop-shadow(0 0 6px ${color}66)` }}
  
  />
  
                  <text x={labelPos.x} y={labelPos.y} textAnchor={anchor} dominantBaseline="middle" fontSize="9" fill={color} opacity="0.9">
  
                    {d.name.replaceAll(/_/g, ' ')}
  
  
  
  
                    <tspan x={labelPos.x} dy="12" fontSize="11" fontWeight="700" fill="#fff">{pct.toFixed(1)}%</tspan>
                  </text>
  
                </g>
  
)

})}

            <circle cx={cx} cy={cy} r={minR - 6} fill="#0b0f1a" stroke="rgba(255,255,255,0.08)" />

          </svg>

        </div>

        <button

type="button"

onClick={() => setShowInfoModal(true)}

className="absolute bottom-4 right-4 z-20 p-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all duration-300 group"

>

          <HelpCircle className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />


        </button>
      </motion.div>

      <FuelInfoModal

isOpen={showInfoModal}

onClose={() => setShowInfoModal(false)}

avgEfficiency={avgEfficiency}

/>

    </>
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

type="button"

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

              Fuel consumed = (Distance / 100) × Fuel Rate × Speed Factor


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
  
      Number.parseFloat(t.total_distance_km).toFixed(1),
  
      Number.parseFloat(t.estimated_fuel_consumed_liters).toFixed(1),
  
      Number.parseFloat(t.fuel_efficiency_km_per_liter).toFixed(1)
  
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



const chronoTrips = [...data.trips].slice(0, 20).reverse()

const tripChartData = chronoTrips.map(trip => ({

  date: new Date(trip.trip_date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' }),

  efficiency: Number.parseFloat(trip.fuel_efficiency_km_per_liter) || 0,

  fuel: Number.parseFloat(trip.estimated_fuel_consumed_liters) || 0,

  distance: Number.parseFloat(trip.total_distance_km) || 0

}))


tripChartData.forEach((d, i, arr) => {

  const start = Math.max(0, i - 2)

  const slice = arr.slice(start, i + 1)

  d.movingAvg = +(slice.reduce((s, x) => s + x.efficiency, 0) / slice.length).toFixed(2)

})



const totalDistance = Math.round(data.summary.total_distance)


const totalFuel = Math.round(data.summary.total_fuel)



const maxEff = data.trips.length > 0 ? Math.max(...data.trips.map(t => Number.parseFloat(t.fuel_efficiency_km_per_liter) || 0)) : 0

const minEff = data.trips.length > 0 ? Math.min(...data.trips.map(t => Number.parseFloat(t.fuel_efficiency_km_per_liter) || 0)) : 0



const recentChrono = [...data.trips].slice(0, 8).reverse()

const effSpark = recentChrono.map(t => Number.parseFloat(t.fuel_efficiency_km_per_liter) || 0)

const fuelSpark = recentChrono.map(t => Number.parseFloat(t.estimated_fuel_consumed_liters) || 0)

let running = 0

const distanceSpark = recentChrono.map(t => {

  running += Number.parseFloat(t.total_distance_km) || 0

  return running

})




const weekdayMap = {}

data.trips.forEach(t => {

  const d = new Date(t.trip_date)

  const dayIdx = (d.getDay() + 6) % 7

  const key = WEEKDAY_ORDER[dayIdx]

  const eff = Number.parseFloat(t.fuel_efficiency_km_per_liter) || 0

  if (!weekdayMap[key]) weekdayMap[key] = { sum: 0, count: 0 }

  weekdayMap[key].sum += eff

  weekdayMap[key].count += 1

})

const radarData = WEEKDAY_ORDER.map(day => ({

  day,

  efficiency: weekdayMap[day] ? +(weekdayMap[day].sum / weekdayMap[day].count).toFixed(1) : 0,

  benchmark: +data.summary.avg_efficiency.toFixed(1)

}))

const activeDays = WEEKDAY_ORDER.filter(d => weekdayMap[d])

const bestDay = activeDays.length

? activeDays.reduce((a, b) => (weekdayMap[a].sum / weekdayMap[a].count) > (weekdayMap[b].sum / weekdayMap[b].count) ? a : b, activeDays[0])

: null



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

        <div className="flex items-center gap-3">

          <span className="flex items-center gap-1.5 text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-full">

            <span className="relative flex h-1.5 w-1.5">

              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />

              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />

            </span>

            Live

          </span>

          <motion.button

type="button"

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

spark={effSpark}

sparkColor="#10B981"

/>

        <StatCard

label="Total Distance"

value={totalDistance}

suffix=" km"

icon={Calendar}

delay={0.15}

spark={distanceSpark}

sparkColor="#1a1a2e"

/>

        <StatCard

label="Total Fuel"

value={totalFuel}

suffix=" L"

icon={Fuel}


delay={0.2}
          spark={fuelSpark}

          sparkColor="#F59E0B"

/>


        <StatCard label="Trips" value={data.summary.trip_count} icon={Award} delay={0.25} />

      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        <EfficiencyGauge value={data.summary.avg_efficiency} />


        <EmissionsCard fuelUsed={totalFuel} />

        <SavingsCard currentEfficiency={data.summary.avg_efficiency} distance={totalDistance} />

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        <WeeklyEfficiencyRadar radarData={radarData} bestDay={bestDay} />

        <RoadDominanceRose data={roadData} totalDistance={totalDistance} />


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

        <span className="text-xs text-gray-400">Show:</span>

        <select

value={days}

onChange={(e) => setDays(Number.parseInt(e.target.value))}

className="text-sm border border-gray-200 rounded-xl px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/20 transition-all"

>

          <option value={7}>7 Days</option>

          <option value={30}>30 Days</option>

          <option value={90}>90 Days</option>

        </select>

        <span className="text-xs text-gray-400 ml-auto">{data.trips.length} trips</span>

      </motion.div>

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

          <div className="flex items-center gap-3">

            <span className="flex items-center gap-1.5 text-[10px] text-gray-400">

              <span className="w-2.5 h-0.5 bg-gray-900 rounded-full" />Efficiency

            </span>

            <span className="flex items-center gap-1.5 text-[10px] text-gray-400">

              <span className="w-2.5 h-0.5 bg-gray-300 rounded-full" style={{ borderTop: '1px dashed #9CA3AF' }} />MA(3)

            </span>

          </div>

        </div>

        <ResponsiveContainer width="100%" height={200}>

          <ComposedChart data={tripChartData}>

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

formatter={(value, name) => [`${value} km/L`, name === 'movingAvg' ? '3-trip avg' : 'Efficiency']}

/>

            <Area

type="monotone"

dataKey="efficiency"

stroke="#1a1a2e"

strokeWidth={2.5}

fill="url(#trendGradient)"

style={{ filter: 'drop-shadow(0 0 5px rgba(16,185,129,0.35))' }}

dot={(props) => {

  const { cx, cy, index } = props

  if (index !== tripChartData.length - 1) return <g key={`dot-${index}`} />

  return (

<g key={`dot-${index}`}>

                    <circle cx={cx} cy={cy} r={4} fill="#10B981" />

                    <circle cx={cx} cy={cy} r={4} fill="#10B981" opacity="0.5">

                      <animate attributeName="r" values="4;10;4" dur="2s" repeatCount="indefinite" />

                      <animate attributeName="opacity" values="0.5;0;0.5" dur="2s" repeatCount="indefinite" />

                    </circle>

                  </g>

)

}}

activeDot={{ r: 5 }}

/>

            <Line

type="monotone"

dataKey="movingAvg"

stroke="#9CA3AF"

strokeWidth={1.5}


strokeDasharray="4 4"
              dot={false}

/>

          </ComposedChart>

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

const eff = Number.parseFloat(trip.fuel_efficiency_km_per_liter) || 0

const isBest = eff === maxEff && maxEff > 0


const isLowest = eff === minEff && minEff > 0 && eff !== maxEff

let color = 'bg-rose-50 text-rose-600'

if (eff > 12) color = 'bg-emerald-50 text-emerald-600'

else if (eff > 8) color = 'bg-amber-50 text-amber-600'

let highlightClass = ''

if (isBest) highlightClass = 'bg-emerald-100/50 border-l-4 border-emerald-500'

else if (isLowest) highlightClass = 'bg-rose-100/50 border-l-4 border-rose-500'

return (

  <motion.tr

  key={trip.trip_id || `trip-${i}`}

  initial={{ opacity: 0 }}

  animate={{ opacity: 1 }}


  transition={{ delay: 0.05 * i }}

  className={`border-b border-gray-50/50 hover:bg-gray-50/30 transition-colors ${highlightClass}`}


>
                    <td className="py-3 px-5 text-gray-700 text-sm">


                      {new Date(trip.trip_date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}

                    </td>

                    <td className="text-right py-3 px-5 text-gray-700 text-sm">

                      {Number.parseFloat(trip.total_distance_km).toFixed(1)} km

                    </td>

                    <td className="text-right py-3 px-5 text-gray-700 text-sm">


                      {Number.parseFloat(trip.estimated_fuel_consumed_liters).toFixed(1)} L

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


  