import DonutChart from './DonutChart'

export default function FleetStatusCard({ active, idle, offline, total }) {
  return (
    <div className="bg-fleet-surface rounded-xl border border-fleet-border p-5">
      <h2 className="font-display font-bold text-fleet-text text-base mb-4">
        Fleet Status
      </h2>
      <DonutChart
        active={active}
        idle={idle}
        offline={offline}
        total={total}
      />
    </div>
  )
}