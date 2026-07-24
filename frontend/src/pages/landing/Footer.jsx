import { Button } from '@/components/ui/button';

export default function Footer() {
  return (
    <footer className='bg-fleet-blue text-white'>
      <div className='text-center px-6 py-20'>
        <h2 className='text-2xl text-fleet-surface md:text-3xl font-bold mb-4'>
          Ready To See Your Fleet in Real Time?
        </h2>
        <p className='text-fleet-secondary text-sm md:text-base mb-8'>
          Get instant access to live tracking, safety scoring, and fleet insights. 
        </p>
        <Button 
          type='button'
          className='bg-fleet-green hover:bg-fleet-green/90 hover:scale-[1.02] focus:scale-[1.02] active:scale-100 text-fleet-surface font-semibold text-sm px-6 py-3 rounded-full'
        >
          View Live Demo
        </Button>
      </div>

      <div className='border bg-fleet-surface px-6 py-6'>
        <p className='text-center text-xs text-fleet-secondary'>
          © {new Date().getFullYear()} V.A.P.O.R - Vehicle Analytics, Processing & Operations in Real-time 
        </p>
      </div>
    </footer>
  );
}