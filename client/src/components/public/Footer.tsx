import type { Contact, ImageRef } from '../../api/types';
import { waLink } from '../../lib/format';
import { ArrowUp, ChatIcon } from '../illustrations/Icons';
import { Logo } from './Logo';

export function Footer({ contact, logo }: { contact: Contact; logo: ImageRef | null }) {
  return (
    <footer className="footer">
      <div className="wrap">
        <Logo className="rv z footer-logo" image={logo} loading="lazy" width={200} height={217} />
        <nav aria-label="Footer">
          <a href="#about">About</a>
          <a href="#services">Services</a>
          <a href="#trips">Trips</a>
          <a href="#how">How it works</a>
          <a href="#team">Team</a>
          <a href={`https://www.instagram.com/${contact.instagram}`} target="_blank" rel="noopener noreferrer">Instagram</a>
          <a href={`mailto:${contact.email}`}>Email</a>
        </nav>
        <div className="footer-base">
          <p>© {new Date().getFullYear()} Through My Trails · Founded by Nachiket R. Patil</p>
          <a className="to-top" href="#top">
            Back to top <ArrowUp size={16} />
          </a>
        </div>
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
