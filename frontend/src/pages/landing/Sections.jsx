import { MapPin, ShieldCheck, History, LayoutGrid } from "lucide-react";

export default function Sections() {
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
      <h2 className="text-3l font-bold text-slate-900 mb-10">
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