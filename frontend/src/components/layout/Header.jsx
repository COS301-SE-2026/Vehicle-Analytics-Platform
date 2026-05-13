import { Bell } from 'lucide-react'

export default function Header({ title }) {
  return (
    <header className="h-[60px] bg-fleet-surface border-b border-fleet-border fixed top-0 right-0 left-[220px] z-10 flex items-center justify-between px-6">
      
      {/* Page Title */}
      <h1 className="font-display font-bold text-xl text-fleet-text">
        {title}
      </h1>

      {/* Right Side */}
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-fleet-green flex items-center justify-center">
          <span className="text-white text-xs font-bold">ZN</span>
        </div>
      </div>
    </header>
  )
}