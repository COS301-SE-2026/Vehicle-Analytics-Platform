import { useEffect, useRef, useState } from 'react';

import mapShot from './img/map.png';
import comparisonShot from './img/vehicle-comparison.png';
import tripShot from './img/trip-replay.png';

function useInView(threshold = 0.25) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect(); // play once
        }
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return [ref, inView];
}


function Panel({ src, alt, show, delay = 0, from, className = '' }) {
  return (
    <div
      className={`absolute overflow-hidden rounded-xl border border-fleet-border bg-fleet-surface shadow-2xl
                  transition-all duration-[900ms] ease-out motion-reduce:transition-none
                  ${show ? 'opacity-100 translate-x-0 translate-y-0 scale-100' : `opacity-0 scale-95 ${from}`}
                  ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <img src={src} alt={alt} className="block w-full h-auto" loading="lazy" decoding="async" />
    </div>
  );
}

export default function ProductShowcase({ className = '' }) {
  const [ref, inView] = useInView();

  return (
    <div
      ref={ref}
      className={`relative w-full h-[340px] sm:h-[440px] lg:h-[500px] ${className}`}
    >
      {/* live map anchors everything */}
      <Panel
        src={mapShot}
        alt="Live map showing the active fleet across Pretoria"
        show={inView}
        delay={0}
        from="translate-y-10"
        className="left-0 top-[6%] w-[74%] z-10"
      />

      <Panel
        src={comparisonShot}
        alt="Vehicle comparison chart of total events per vehicle"
        show={inView}
        delay={180}
        from="translate-x-12 -translate-y-8"
        className="right-0 top-0 w-[46%] z-20"
      />

      <Panel
        src={tripShot}
        alt="Trip replay with an event timeline of harsh braking and acceleration"
        show={inView}
        delay={340}
        from="translate-x-10 translate-y-12"
        className="right-[2%] bottom-[4%] w-[62%] z-30"
      />
    </div>
  );
}