import { assetUrl } from '../../api/client';
import type { Contact, ImageRef } from '../../api/types';
import { waLink } from '../../lib/format';
import { ChatIcon } from '../illustrations/Icons';

export function Footer({ contact, logo }: { contact: Contact; logo: ImageRef | null }) {
  return (
    <footer className="footer">
      <div className="wrap">
        <img className="rv z" src={logo ? assetUrl(logo.url) : '/assets/logo-full.png'} alt="Through My Trails" loading="lazy" width={220} />
        <nav aria-label="Footer">
          <a href="#services">Services</a>
          <a href="#trips">Trips</a>
          <a href="#how">How it works</a>
          <a href={`https://www.instagram.com/${contact.instagram}`} target="_blank" rel="noopener noreferrer">Instagram</a>
          <a href={`mailto:${contact.email}`}>Email</a>
        </nav>
        <p>Founded by Nachiket R. Patil · Built with passion for travellers</p>
        <p style={{ fontSize: 13 }}>© {new Date().getFullYear()} Through My Trails</p>
      </div>
    </footer>
  );
}

export function WhatsAppFab({ whatsapp }: { whatsapp: string }) {
  return (
    <a className="fab" href={waLink(whatsapp)} target="_blank" rel="noopener noreferrer" aria-label="Chat on WhatsApp">
      <span className="ring"><ChatIcon size={22} color="#F7F1E7" /></span>
      <span className="lbl">Plan with us</span>
    </a>
  );
}
