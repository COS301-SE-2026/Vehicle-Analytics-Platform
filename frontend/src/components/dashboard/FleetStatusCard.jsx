import DonutChart from './DonutChart'
import PropTypes from 'prop-types'

export default function FleetStatusCard({ active, idle, offline, total }) {
  return (
      <DonutChart
        active={active}
        idle={idle}
        offline={offline}
        total={total}
      />
  )
}

FleetStatusCard.propTypes = {
  active:   PropTypes.number,
  idle:     PropTypes.number,
  offline:  PropTypes.number,
  total:    PropTypes.number,
}