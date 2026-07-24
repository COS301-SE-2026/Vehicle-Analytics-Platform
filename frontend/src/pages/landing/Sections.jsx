import { 
    MapPin, ShieldCheck, History, LayoutGrid,
    Radio, CloudCog, Gauge, ArrowRight, TrendingUpDown, TrendingUp
} from "lucide-react";
import Dashboard from "./img/dashboard.png"

function WhatYouGet() {
    const features = [
        {
            icon: MapPin,
            title: "Always Know Where Your Fleet Is - Live Fleet Map",
            description: "Stop calling drivers to ask where they are. See every vehicle’s exact position, updated every second.",

        },
        {
            icon: ShieldCheck,
            title: "Catch Risky Driving Before It Costs You - Driver Safety Scoring",
            description: "Get automatic alerts on harsh braking, speeding, and cornering. Coach drivers before a habit becomes an accident.",
        },
        {
            icon: History,
            title: "Settle Any Dispute in Minutes - Trip History & Playback",
            description: "Replay any trip with full route and event data. No more disputes over a late delivery or complaint.",
        },
        {
            icon: LayoutGrid,
            title: "Give Everyone the Right View, Instantly - Role-Based Dashboards",
            description: "Viewers see the live map, managers see the KPIs, admins see it all. Nobody digs through irrelevant data.",
        },
    ];

  return (
    <section className="max-w-7xl mx-auto px-6 py-20">
      <h2 className="text-3xl font-bold text-slate-900 mb-10">
        What You Get, Every Day
      </h2>

      <div className="grid md:grid-cols-2 gap-12 items-start">
        {/* ADD IMAGE HERE */}
        <img src="" alt="Fleet of trucks" className="rounded-2xl w-full h-auto object-cover" />
        <div className="flex flex-col gap-6">
            {features.map(({icon: Icon, title, description}) => (
                <div key={title} className="flex gap-3">
                    <Icon className="w-h h-5 text-fleet-green shrink-0 mt-1" />
                    <div>
                        <h3 className="font-bold text-slate-900">{title}</h3>
                        <p className="text-sm text-slate-500 mt-1">{description}</p>
                    </div>
                </div>
            ))}
        </div>
      </div>
    </section>
  );
}

export function HowItWorks(){
    const flow = [
        {
            icon: Radio,
            title: "Live Data Stream",
            description: "Vehicle telemetry streams in every 5–10 seconds.",
        },
        {
            icon: CloudCog,
            title: "Cloud Processing",
            description: "Telemetry is processed and scored in real time on AWS.",
        },
        {
            icon: Gauge,
            title: "Dashboard Insights",
            description: "Every role sees clear, actionable insight the moment it happens",
        },
    ];

    return (
        <section className="max-w-7xl mx-auto px-6 py-20 text-center">
            <h2 className="text-3xl font-bold text-slate-900 mb-16"> HOW V.A.P.O.R WORKS</h2>

            <div className="flex flex-col md:flex-row items-center justify gap-8 md:gap-4 max-w-4xl mx-auto">
                {flow.map(({icon: Icon, title, description }, i) => (
                    <div key={title} className="flex items-center gap-4">
                        <div className="max-w-[220px]">
                         <Icon className="w-6 h-6 text-fleet-green mc-auto mb-3"/>
                         <h3 className="font-bold text-slate-900">{title}</h3>
                         <p className="text-sm text-slate-500 mt-1">{description}</p>
                        </div>

                        {i < flow.length - 1 && (
                            <ArrowRight className="w-h h-5 text-fleet-green text-slate-300 hidden md:block shrink-0" />
                        )}
                    </div>
                ))}
            </div>
        </section>
    )
}

export function CommandCenter(){
   return (
        <section className="bg-fleet-surface px-6 py-20">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-center text-2xl md:text-3xl font-bold text-fleet-blue mb-10">
                Your Command Center
            </h2>

            <div className="rounded-2xl shadow-lg overflow-hidden border border-fleet-idle">
                <img 
                    src={Dashboard}
                    alt="V.A.P.O.R Fleet Dashboard"
                    className="w-full h-auto"
                />
            </div>
          </div>
        </section>
   );
}

export default function Sections() {
    return (
        <>
        <WhatYouGet />
        <HowItWorks />
        <CommandCenter />
        </>
    )
}