import { useRef } from 'react';
import type { Contact as ContactInfo, PublicTripType } from '../../api/types';
import { useFlightPath } from '../../hooks/useScrollEffects';
import { telHref, waLink } from '../../lib/format';
import { ChatIcon, InstagramIcon, MailIcon, PLANE_PATH, PhoneIcon } from '../illustrations/Icons';
import { EnquiryForm, TripPreset } from './EnquiryForm';

const FLIGHT_D =
  'M-20 250 C 180 250, 300 120, 430 170 C 530 210, 480 290, 430 255 C 390 225, 470 140, 620 160 S 980 80, 1230 50';

interface Props {
  contact: ContactInfo;
  trips: PublicTripType[];
  preset: TripPreset | null;
}

export function Contact({ contact, trips, preset }: Props) {
  const section = useRef<HTMLElement>(null);
  const path = useRef<SVGPathElement>(null);
  const plane = useRef<SVGGElement>(null);
  useFlightPath(section, path, plane);

  return (
    <section id="contact" className="fly-sec" ref={section}>
      <svg className="fly-svg" viewBox="0 0 1200 300" preserveAspectRatio="none" aria-hidden="true">
        <path d={FLIGHT_D} fill="none" stroke="#2E2219" strokeOpacity="0.22" strokeWidth="1.6" strokeDasharray="4 9" />
        <path ref={path} d={FLIGHT_D} fill="none" stroke="#A67C4E" strokeWidth="2.4" strokeLinecap="round" />
        <g ref={plane} transform="translate(-20 250)">
          <path d={PLANE_PATH} fill="#2E2219" transform="scale(1.5)" />
        </g>
      </svg>

      <div className="wrap split contact-grid">
        <div>
          <p className="caps rv" style={{ margin: '0 0 10px' }}>Let's connect</p>
          <h2 className="script rv d1 contact-script" style={{ fontWeight: 400 }}>
            Let's turn your travel dreams into plans <span className="heart" aria-hidden="true">♥</span>
          </h2>
          <p className="lead rv d2" style={{ maxWidth: 460, marginBottom: 30 }}>
            Send an enquiry, or say hello on whichever app you like. Real replies from a real travel planner.
          </p>
          <div className="contact-rows">
            <a className="crow rv d2" href={telHref(contact.phone)}>
              <span className="cico"><PhoneIcon size={22} /></span>
              <span>{contact.phone}</span>
            </a>
            <a className="crow rv d3" href={waLink(contact.whatsapp)} target="_blank" rel="noopener noreferrer">
              <span className="cico"><ChatIcon size={22} /></span>
              <span>Chat on WhatsApp</span>
            </a>
            <a className="crow rv d3" href={`mailto:${contact.email}`}>
              <span className="cico"><MailIcon size={22} /></span>
              <span>{contact.email}</span>
            </a>
            <a className="crow rv d4" href={`https://www.instagram.com/${contact.instagram}`} target="_blank" rel="noopener noreferrer">
              <span className="cico"><InstagramIcon size={22} /></span>
              <span>@{contact.instagram}</span>
            </a>
          </div>
        </div>
        <div className="rv z d2">
          <EnquiryForm trips={trips} whatsapp={contact.whatsapp} preset={preset} />
        </div>
      </div>
    </section>
  );
}
