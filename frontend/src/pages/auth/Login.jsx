export default function Login() {
  return (
    <div className="flex min-h-screen">
      {/* Left panel */}
      <div className="w-[42%] bg-fleet-green p-12">
        <p className="text-white font-display text-2xl font-bold">FleetTracker</p>
      </div>
      {/* Right panel */}
      <div className="flex-1 bg-fleet-bg flex items-center justify-center">
        <p className="font-display text-fleet-text">Login form goes here</p>
      </div>
    </div>
  )
}