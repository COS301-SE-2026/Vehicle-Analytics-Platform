import DonutChart from './DonutChart'

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