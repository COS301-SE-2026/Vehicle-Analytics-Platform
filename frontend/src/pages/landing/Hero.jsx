import { Button } from '@/components/ui/button';
import { Database, Zap, ShieldCheck, Clock, ShieldAlert, Unplug } from 'lucide-react'

export default function Header() {
  const painPoints = [
    {
      icon: Clock,
      title: "Delayed Reports",
      description: "By the time your data arrives, the incident is hours old."
    },
    {
      icon: ShieldAlert,
      title: "Blind Spots on Risky Driving",
      description: "Without continous scoring, dangerous behaviour goes unnoticed until it's too late"
    },
    {
      icon: Unplug,
      title: "Disconnected Tools",
      description: "Tracking in one application, safety in another, reports in a spreadsheet - fragmentation kills efficiency"
    },
  ];

  return (
    <section className="max-w-7xl mx-auto px-6 py-16">
      {/* HEADING & IMAGE */}
      <div className='grid md:grid-cols-2 gao-12 items-center'>
      {/* TEXT */}
       <div>
        <h1 className='text-3xl md:text-3xl font-bold text-slate-900 leading-tight'>
          Know Where <br />
          Every Vehicle Is. <br />
          Every Second. <br />
          Zero Guesswork. <br />
        </h1>

        <p className='mt-6 text-slate-500 max-x-md'>
          No more scattered spreadsheets and delayed<br/>
          reports. V.A.P.O.R turns live vehicle telemetry into<br/>
          precise tracking, driver safety scoring, and precise<br/>
          tracking, driver safety scoring, and predictive insights<br/>
          - from live map to admin reporting, all in one place.
        </p>

        <Button className="mt-8 bg-fleet-blue hover:scale-[1.02] focus:scale-[1.02] active:scale-100 hover:bg-fleet-blue/90 text-white rounded-full px-6" >
         View Live Demo Fleet
        </Button>
       </div>

       {/* IMAGE*/}
       <div className='rounded-2xl overflow-hidden shadow-lg'>
        {/* <img src="" alt="" /> */}
       </div>
      </div>

      {/* TRUST BAR */}
      <div className='mt-20 flex flex-wrap justify-center gap-10 text-sm text-slate-500'>
        <div className='flex items-center gap-2'>
          <Database className='w-4 h-4 text-green-600'/> Built on AWS
        </div>
        <div className='flex items-center gap-2'>
          <Zap className='w-4 h-4 text-green-600'/> Updates every 5-10 seconds
        </div>
        <div className='flex items-center gap-2'>
          <ShieldCheck className='w-4 h-4 text-green-600'/> 15+ vehicles supported
        </div>
      </div>

      {/* PAIN POINTS */}
      <div className='mt-20 grid md:grid-cols-3 gap-12'>
        {painPoints.map(({icon: Icon, title, description}) => (
          <div
            key={title}
            className='bg-fleet-bg rounded-xl border border-slate-100 shadow-sm p-6
                        hover:-translate-y-1 hover:scale-[1.02] hover:shadow-lg hover:z-10 realtive
                        transitiona-all duration 200'
          >
            <Icon className='w-5 h-5 text-slate-700 mb-3'/>
            <h3 className='font-bold text-slate-900 mb-1'>{title}</h3>
            <p className='text-sm text-slate-500'>{description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}