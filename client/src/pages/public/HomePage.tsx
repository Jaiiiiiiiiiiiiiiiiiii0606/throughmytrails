import { useCallback, useRef, useState } from 'react';
import { useSiteContent } from '../../api/public';
import { About } from '../../components/public/About';
import { Contact } from '../../components/public/Contact';
import type { TripPreset } from '../../components/public/EnquiryForm';
import { Footer, WhatsAppFab } from '../../components/public/Footer';
import { Hero } from '../../components/public/Hero';
import { HowItWorks } from '../../components/public/HowItWorks';
import { Marquee } from '../../components/public/Marquee';
import { Navbar } from '../../components/public/Navbar';
import { SampleItinerary } from '../../components/public/SampleItinerary';
import { Services } from '../../components/public/Services';
import { Trips } from '../../components/public/Trips';
import { ZoomStatement } from '../../components/public/ZoomStatement';
import { useReveal } from '../../hooks/useReveal';
import '../../theme/site.css';

export default function HomePage() {
  const root = useRef<HTMLDivElement>(null);
  const { content, dataUpdatedAt } = useSiteContent();
  const [preset, setPreset] = useState<TripPreset | null>(null);
  useReveal(root, [dataUpdatedAt]);

  const onPlan = useCallback((key: string) => setPreset({ key, nonce: Date.now() }), []);
  const { images, contact, tripTypes, services } = content;

  return (
    <div className="site" ref={root}>
      <a className="skip-link" href="#contact">Skip to the enquiry form</a>
      <Navbar whatsapp={contact.whatsapp} />
      <main>
        <Hero heroImage={images.hero} logoImage={images.logo} whatsapp={contact.whatsapp} instagram={contact.instagram} />
        <Marquee />
        <About image={images.about} />
        <Services services={services} />
        <Trips trips={tripTypes} whatsapp={contact.whatsapp} onPlan={onPlan} />
        <HowItWorks />
        <SampleItinerary />
        <ZoomStatement />
        <Contact contact={contact} trips={tripTypes} preset={preset} />
      </main>
      <Footer contact={contact} logo={images.logo} />
      <WhatsAppFab whatsapp={contact.whatsapp} />
    </div>
  );
}
