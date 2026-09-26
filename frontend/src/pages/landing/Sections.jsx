import { 
    MapPin, ShieldCheck, History, LayoutGrid,
    Radio, CloudCog, Gauge, ArrowRight,
    Tags, BellRing, Fuel, BarChart3
} from "lucide-react";
import Dashboard from "./img/dashboard.png"
import Vehicle from "./img/vehicles.png"
import{ motion } from "framer-motion";

export function WhatYouGet() {
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
            description: "Replay any trip with full route data and speed visualization along the way. No more disputes over a late delivery or complaint.",
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

      <div className="grid md:grid-cols-2 gap-12 items-stretch">
        {/* ADD IMAGE HERE */}
        <img src={Vehicle} alt="Fleet of trucks" className="rounded-2xl w-full h-full object-contain" />
        <div className="flex flex-col gap-6">
            {features.map(({icon: Icon, title, description}) => (
                <div key={title} className="flex gap-3">
                    <Icon className="w-5 h-5 text-fleet-blue shrink-0 mt-1" />
                    <div>
                        <h3 className="font-bold text-slate-900 mb-3">{title}</h3>
                        <p className="text-sm text-slate-500 mt-1">{description}</p>
                    </div>
                </div>
            ))}
        </div>
      </div>
    </section>
  );
}

export function MoreCapabilities() {
    const capabilities = [
        {
            icon: Tags,
            title: "Organize Fleets Your Way",
            description: "Group vehicles by fleet, depot, or client with custom organization tags - built for how you actually operate.",
        },
        {
            icon: BellRing,
            title: "Set the Alerts That Matter to You",
            description: "Define your own speed thresholds and time-based restrictions, and get notified the moment they're crossed.",
        },
        {
            icon: Fuel,
            title: "Spot Fuel Waste Before It Adds Up",
            description: "Fuel efficiency metrics are calculated automatically from distance and speed data - no extra hardware needed.",
        },
        {
            icon: BarChart3,
            title: "See Trends, Not Just Snapshots",
            description: "Daily and weekly summaries roll up driver behaviour and fleet performance, so patterns are obvious at a glance.",
        },
    ];

    return (
        <section className="max-w-7xl mx-auto px-6 py-20">
            <h2 className="text-3xl font-bold text-fleet-text mb-10">
                Built for How Fleets Actually Run
            </h2>
 
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {capabilities.map(({ icon: Icon, title, description }) => (
                    <div
                        key={title}
                        tabIndex={0}
                        className="group h-48 rounded-xl [perspective:1200px] outline-none
                                   transition-transform duration-200 hover:-translate-y-1
                                   focus-visible:ring-2 focus-visible:ring-fleet-blue focus-visible:ring-offset-2"
                    >
                        {/* The piece that actually rotates */}
                        <div
                            className="relative h-full w-full transition-transform duration-500 ease-out
                                       [transform-style:preserve-3d]
                                       group-hover:[transform:rotateY(180deg)]
                                       group-focus-visible:[transform:rotateY(180deg)]
                                       motion-reduce:transition-none"
                        >
                            {/* FRONT — icon and title */}
                            <div
                                className="absolute inset-0 flex flex-col justify-center rounded-xl
                                           border border-fleet-border bg-fleet-bg p-6 shadow-sm
                                           [backface-visibility:hidden]"
                            >
                                <Icon className="w-6 h-6 text-fleet-blue mb-3" />
                                <h3 className="font-bold text-fleet-text text-lg leading-snug">{title}</h3>
                            </div>
 
                            {/* BACK — the description */}
                            <div
                                className="absolute inset-0 flex items-center rounded-xl bg-fleet-bg p-6 shadow-lg
                                           [backface-visibility:hidden] [transform:rotateY(180deg)]"
                            >
                                <p className="text-sm leading-relaxed text-fleet-text">{description}</p>
                            </div>
                        </div>
                    </div>
                ))}
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

            <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-4 max-w-4xl mx-auto">
                {flow.map(({icon: Icon, title, description }, i) => (
                    <motion.div
                        key={title} 
                        className="flex items-center gap-4"
                        initial={{ opacity: 0, y: 20}}
                        whileInView={{ opacity: 1, y: 0}}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: i * 0.15 }}
                    >
                        <div className="max-w-[220px]">
                         <Icon className="w-6 h-6 text-fleet-blue mx-auto mb-3"/>
                         <h3 className="font-bold text-slate-900 text-fleet-text">{title}</h3>
                         <p className="text-sm text-slate-500 mt-1">{description}</p>
                        </div>

                        {i < flow.length - 1 && (
                            <ArrowRight className="w-5 h-5 text-fleet-green text-slate-300 hidden md:block shrink-0" />
                        )}
                    </motion.div>
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
        <MoreCapabilities />
        <HowItWorks />
        <CommandCenter />
        </>
    )
}