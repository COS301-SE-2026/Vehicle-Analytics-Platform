import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Link } from "react-router-dom";

import { Database, Zap, ShieldCheck, Clock, ShieldAlert, Unplug } from 'lucide-react';
import cityNight from './img/cars3.jpg';

const painPoints = [
  {
    icon: Clock,
    title: "Delayed Reports",
    description: "By the time your data arrives, the incident is hours old."
  },
  {
    icon: ShieldAlert,
    title: "Blind Spots on Risky Driving",
    description: "Without continuous scoring, dangerous behaviour goes unnoticed until it's too late."
  },
  {
    icon: Unplug,
    title: "Disconnected Tools",
    description: "Tracking in one application, safety in another, reports in a spreadsheet — fragmentation kills efficiency."
  },
];


const EXPAND = [0, 0.45];
const FLY_APART = [0, 0.32];
const DIM = [0.18, 0.45];
const REVEAL = [0.45, 0.65];

const CARD_RADIUS = 24; 
const SMOOTHING = 0.12; 

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const phase = (p, [start, end]) => clamp01((p - start) / (end - start));
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const easeIn = (t) => t * t;

export default function Hero({ mapImage = cityNight }) {
  const containerRef = useRef(null);
  const mediaRef = useRef(null);
  const titleTopRef = useRef(null);
  const titleBottomRef = useRef(null);
  const expandedContentRef = useRef(null);
  const overlayRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    const media = mediaRef.current;
    const titleTop = titleTopRef.current;
    const titleBottom = titleBottomRef.current;
    const content = expandedContentRef.current;
    const overlay = overlayRef.current;

    if(!container || !media) 
      return;

    const base = { w: 0, h: 0 };

    const measure = () => {
      media.style.width = '';
      media.style.height = '';
      const rect = media.getBoundingClientRect();
      base.w = rect.width;
      base.h = rect.height;
    };

    const readProgress = () => {
      const travel = container.offsetHeight - window.innerHeight;
      if (travel <= 0) return 0;
      return clamp01(-container.getBoundingClientRect().top / travel);
    };

    const apply = (p) => {
      const expand = easeInOut(phase(p, EXPAND));
      const fly = easeIn(phase(p, FLY_APART));
      const dim = phase(p, DIM);
      const reveal = phase(p, REVEAL);

      media.style.width = `${base.w + (window.innerWidth - base.w) * expand}px`;
      media.style.height = `${base.h + (window.innerHeight - base.h) * expand}px`;
      media.style.borderRadius = `${CARD_RADIUS * (1 - expand)}px`;

      titleTop.style.transform = `translate3d(${-110 * fly}vw, 0, 0)`;
      titleBottom.style.transform = `translate3d(${110 * fly}vw, 0, 0)`;

      overlay.style.opacity = `${0.15 * dim}`;

      content.style.opacity = `${reveal}`;
      content.style.transform = `translate3d(0, ${20 * (1 - reveal)}px, 0)`;
      content.style.pointerEvents = reveal > 0.9 ? 'auto' : 'none';
    };

  
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reduced.matches) {
      measure();
      apply(1);
      titleTop.style.visibility = 'hidden';
      titleBottom.style.visibility = 'hidden';
      return;
    }

    const state = { value: 0, target: 0 };
    let frame = null;

    const loop = () => {
      const diff = state.target - state.value;
      if (Math.abs(diff) < 0.0004) {
        state.value = state.target;
        apply(state.value);
        frame = null;
        return;
      }
      state.value += diff * SMOOTHING;
      apply(state.value);
      frame = requestAnimationFrame(loop);
    };

    const request = () => {
      if (frame === null) frame = requestAnimationFrame(loop);
    };

    const onScroll = () => {
      state.target = readProgress();
      request();
    };

    const onResize = () => {
      measure();
      state.target = readProgress();
      state.value = state.target; 
      apply(state.value);
    };

    measure();
    state.target = readProgress();
    state.value = state.target;
    apply(state.value);

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, []);

  return (  
    <>
      <section ref={containerRef} className="relative h-[200vh]">
        <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden">
          {/* Atmospheric background */}
          <div className="absolute inset-0 z-0 bg-fleet-blue">
            <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-[radial-gradient(circle,#E67E22_0%,transparent_70%)] opacity-[0.35] blur-[90px]" />
            <div className="absolute bottom-1/4 right-1/4 h-80 w-80 rounded-full bg-[radial-gradient(circle,#4D7C5F_0%,transparent_70%)] opacity-30 blur-[90px]" />
            <svg className="absolute inset-0 h-full w-full opacity-[0.07]" aria-hidden="true">
              <defs>
                <pattern id="fleet-grid" width="60" height="60" patternUnits="userSpaceOnUse">
                  <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#F4F3EF" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#fleet-grid)" />
            </svg>
          </div>

          {/* Image card — expands on scroll */}
          <div
            ref={mediaRef}
            className="relative z-20 h-[min(440px,62vh)] w-[min(340px,82vw)] overflow-hidden rounded-3xl shadow-[0_30px_80px_-20px_rgba(20,48,79,0.75)] [will-change:width,height]"
          >
            <div className="relative h-full w-full overflow-hidden bg-fleet-blue">
              <img
                src={mapImage}
                alt="A fleet of trucks and vans lined up"
                className="absolute inset-0 h-full w-full object-cover opacity-90"
                loading="eager"
                decoding="async"
              />

              {/* Tints the scene toward the brand blue */}
              <div className="absolute inset-0 bg-fleet-blue/45 mix-blend-color" />

              {/* Scrim: heavy at the base so the CTA stays readable, light up top */}
              <div className="absolute inset-0 bg-gradient-to-t from-fleet-blue via-fleet-blue/25 to-fleet-blue/40" />

              {/* Darkens the image once it fills the screen */}
              <div ref={overlayRef} className="absolute inset-0 bg-fleet-blue/60 opacity-0" />
            </div>
          </div>

          {/* Hero title — the two lines fly apart on scroll */}
          <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center">
            <h1 className="flex flex-col items-center gap-1 px-4 text-center">
              <span
                ref={titleTopRef}
                className="font-display text-7xl font-extrabold uppercase leading-[0.85] tracking-tighter text-fleet-bg [mix-blend-mode:difference] [will-change:transform]"
              >
                Vehicle Analytics, Processing &
              </span>
              <span
                ref={titleBottomRef}
                className="font-display text-7xl font-extrabold uppercase leading-[0.85] tracking-tighter text-fleet-bg [mix-blend-mode:difference] [will-change:transform]"
              >
                 Operations in Real-time
              </span>
            </h1>
          </div>

          {/* Revealed once the image fills the screen */}
          <div
            ref={expandedContentRef}
            className="pointer-events-none absolute bottom-12 left-0 z-50 w-full translate-y-5 px-6 opacity-0 sm:px-10"
          >
            <div className="mx-auto max-w-6xl grid md:grid-cols-2 gap-10 items-end">
              {/* TEXT */}
              <div>
                <h2 className="text-5xl font-bold leading-tight text-fleet-bg">
                  Know where every vehicle is.<br />
                  Every second. Zero guesswork.
                </h2>

                <p className="mt-5 max-w-md text-fleet-bg text-lg leading-relaxed">
                  No more scattered spreadsheets and delayed reports. V.A.P.O.R turns live vehicle
                  telemetry into precise tracking, driver safety scoring and predictive insights —
                  from live map to admin reporting, all in one place.
                </p>

                <Button
                  asChild
                  className="mt-7 bg-fleet-warning hover:bg-fleet-warning/90 hover:scale-[1.02] focus:scale-[1.02] active:scale-100 text-fleet-blue font-semibold rounded-full px-6"
                >
                  <Link to="/signup">View Live Demo Fleet</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      
      <section className="bg-fleet-surface">
       
          {/* PAIN POINTS */}
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid md:grid-cols-3 gap-12">
            {painPoints.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="relative bg-fleet-bg rounded-xl border border-fleet-border shadow-sm p-6
                           hover:-translate-y-1 hover:scale-[1.02] hover:shadow-lg hover:z-10
                           transition-all duration-200"
              >
                <Icon className="w-5 h-5 text-fleet-blue mb-3" />
                <h3 className="font-bold text-fleet-text mb-1">{title}</h3>
                <p className="text-sm text-fleet-secondary">{description}</p>
              </div>
            ))}
          </div>
        </div>

     {/* TRUST BAR */}
      <div className='mt-10 flex flex-wrap justify-center gap-12 text-sm text-slate-500'>
        <div className='flex items-center gap-2'>
          <Database className='w-4 h-4 text-fleet-blue'/> Built on AWS
        </div>
        <div className='flex items-center gap-2'>
          <Zap className='w-4 h-4 text-fleet-blue'/> Updates every 5-10 seconds
        </div>
        <div className='flex items-center gap-2'>
          <ShieldCheck className='w-4 h-4 text-fleet-blue'/> 100+ vehicles supported
        </div>
      </div>     
      </section>
    </>
  );
}