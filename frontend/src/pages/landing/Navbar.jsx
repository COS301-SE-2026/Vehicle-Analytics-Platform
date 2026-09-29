import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import vaporlogo from "./img/logo.png"

export default function Navbar() {
    return (
        <header className="fixed inset-x-0 top-0 z-50  bg-fleet-blue">
            <div className="w-full px-6 sm:px-10 py-3 flex items-center justify-between">
             {/* LOGO */} 
             <img src={vaporlogo} alt="V.A.P.O.R" className="w-auto h-16 md:h-20" />
             {/* CALL TO ACTION BUTTON */}
             <Button className="bg-fleet-warning hover:bg-fleet-warning/90 hover:scale-[1.02] focus:scale-[1.02] active:scale-100 text-fleet-blue font-semibold rounded-full px-6">
                <Link to="/signup">View Live Demo Fleet</Link>
             </Button>
            </div>
        </header>
    )
}