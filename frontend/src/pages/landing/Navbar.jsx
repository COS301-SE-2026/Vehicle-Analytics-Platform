import { Button } from "@/components/ui/button";
import vaporlogo from "./logo.png"

export default function Navbar() {
    return (
        <header className="w-full bg-fleet-surface border-b border-slate-100">
            <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
             {/* LOGO */} 
             <img src={vaporlogo} alt="V.A.P.O.R" className="w-auto h-24" />
             {/* CALL TO ACTION BUTTON */}
             <Button className="bg-fleet-blue hover:bg-fleet-blue/90 text-white rounded-full px-6">
                View Live Demo Fleet
             </Button>
            </div>
        </header>
    )
}