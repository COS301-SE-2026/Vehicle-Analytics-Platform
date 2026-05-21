import PropTypes from 'prop-types'

export default function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <div className="bg-white rounded-2xl p-6 flex items-start justify-between shadow-sm border border-gray-100">
      <div>
        <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-2">
          {label}
        </p>
        <p className="text-4xl font-bold text-gray-800 leading-none">
          {value}
          <span className="text-base font-normal text-gray-400 ml-2">{sub}</span>
        </p>
      </div>
      <Icon className="w-8 h-8 text-green-700 opacity-70" />
    </div>
  )
}

StatCard.propTypes = {
  icon:  PropTypes.elementType,
  label: PropTypes.string,
  value: PropTypes.number,
  sub:   PropTypes.string,
}