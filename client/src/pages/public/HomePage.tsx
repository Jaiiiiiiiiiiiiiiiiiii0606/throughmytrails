import { useCallback, useEffect, useRef, useState } from 'react';
import { useSiteContent } from '../../api/public';
import { About } from '../../components/public/About';
import { Contact } from '../../components/public/Contact';
import { Cursor } from '../../components/public/Cursor';
import type { TripPreset } from '../../components/public/EnquiryForm';
import { Footer, WhatsAppFab } from '../../components/public/Footer';
import { Hero } from '../../components/public/Hero';
import { HowItWorks } from '../../components/public/HowItWorks';
import { Marquee } from '../../components/public/Marquee';
import { Navbar } from '../../components/public/Navbar';
import { Preloader } from '../../components/public/Preloader';
import { SampleItinerary } from '../../components/public/SampleItinerary';
import { Services } from '../../components/public/Services';
import { Team } from '../../components/public/Team';
import { Trips } from '../../components/public/Trips';
import { ZoomStatement } from '../../components/public/ZoomStatement';
import { usePointerFx } from '../../hooks/usePointerFx';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useReveal } from '../../hooks/useReveal';
import { startSmoothScroll, stopSmoothScroll } from '../../lib/smoothScroll';
import '../../theme/site.css';

export default function HomePage() {
  const root = useRef<HTMLDivElement>(null);
  const { content, dataUpdatedAt } = useSiteContent();
  const [preset, setPreset] = useState<TripPreset | null>(null);
  const [loading, setLoading] = useState(true);
  const reduce = useReducedMotion();
  useReveal(root, [dataUpdatedAt]);
  usePointerFx(root, [dataUpdatedAt]);

  useEffect(() => {
    if (reduce) return;
    startSmoothScroll();
    return stopSmoothScroll;
  }, [reduce]);

  const onPlan = useCallback((key: string) => setPreset({ key, nonce: Date.now() }), []);
  const onIntroDone = useCallback(() => setLoading(false), []);
  const { images, contact, tripTypes, services, team } = content;

  return (
    <div className={`site ${loading ? 'loading' : ''}`} ref={root}>
      <Preloader logo={images.logo} onDone={onIntroDone} />
      <Cursor />
      <a className="skip-link" href="#contact">Skip to the enquiry form</a>
      <Navbar whatsapp={contact.whatsapp} logo={images.logo} />
      <main>
        <Hero heroImage={images.hero} logoImage={images.logo} whatsapp={contact.whatsapp} instagram={contact.instagram} />
        <Marquee />
        <About image={images.about} />
        <Services services={services} />
        <Trips trips={tripTypes} whatsapp={contact.whatsapp} onPlan={onPlan} />
        <HowItWorks />
        <SampleItinerary logo={images.logo} />
        <ZoomStatement />
        <Contact contact={contact} trips={tripTypes} preset={preset} />
        <Team team={team ?? []} />
      </main>
      <Footer contact={contact} logo={images.logo} />
      <WhatsAppFab whatsapp={contact.whatsapp} />
    </div>
  );
}
