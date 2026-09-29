import type { SVGProps } from 'react';
import type { ServiceIconName } from '../../lib/constants';

type P = SVGProps<SVGSVGElement> & { size?: number };

const base = (size = 24, sw = 1.7): SVGProps<SVGSVGElement> => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: sw,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
});

export const ChatIcon = ({ size, ...p }: P) => (
  <svg {...base(size, 1.8)} {...p}><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" /></svg>
);
export const PhoneIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" /></svg>
);
export const MailIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 7 L12 13 L2 7" /></svg>
);
export const InstagramIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" /></svg>
);
export const ArrowRight = ({ size = 16, ...p }: P) => (
  <svg {...base(size, 2)} {...p}><path d="M5 12 H19 M13 6 L19 12 L13 18" /></svg>
);
export const ArrowDown = ({ size = 18, ...p }: P) => (
  <svg {...base(size, 2)} {...p}><path d="M12 5 V19 M6 13 L12 19 L18 13" /></svg>
);
export const PlaneIcon = ({ size = 40, ...p }: P) => (
  <svg width={size} height={size} viewBox="-16 -16 32 32" aria-hidden="true" focusable="false" {...p}>
    <path d="M12 0 L4 -2 L-2 -11 L-5 -11 L-2 -2 L-8 -2 L-11 -6 L-13 -6 L-11 0 L-13 6 L-11 6 L-8 2 L-2 2 L-5 11 L-2 11 L4 2 Z" fill="currentColor" />
  </svg>
);
export const AlertIcon = ({ size = 20, ...p }: P) => (
  <svg {...base(size, 2)} {...p}><circle cx="12" cy="12" r="10" /><path d="M12 7v6M12 16.5v.5" /></svg>
);

/** Plane silhouette path used by the hero orbit and the contact flight. */
export const PLANE_PATH = 'M12 0 L4 -2 L-2 -11 L-5 -11 L-2 -2 L-8 -2 L-11 -6 L-13 -6 L-11 0 L-13 6 L-11 6 L-8 2 L-2 2 L-5 11 L-2 11 L4 2 Z';

const SERVICE_PATHS: Record<ServiceIconName, JSX.Element> = {
  flight: <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />,
  hotel: <><path d="M2 4v16" /><path d="M2 8h18a2 2 0 0 1 2 2v10" /><path d="M2 17h20" /><path d="M6 8v9" /></>,
  map: <><path d="M3 6 L9 3 L15 6 L21 3 V18 L15 21 L9 18 L3 21 Z" /><path d="M9 3 V18 M15 6 V21" /></>,
  wallet: <><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" /><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" /></>,
  compass: <><circle cx="12" cy="12" r="10" /><path d="m16.2 7.8-2.1 6.3-6.3 2.1 2.1-6.3z" /></>,
  camera: <><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z" /><circle cx="12" cy="13" r="3.5" /></>,
  passport: <><rect x="4" y="2" width="16" height="20" rx="2" /><circle cx="12" cy="10" r="3.5" /><path d="M8 17h8" /></>,
  heart: <path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7Z" />,
};

export function ServiceIcon({ name, size = 26 }: { name: ServiceIconName; size?: number }) {
  return <svg {...base(size, 1.6)}>{SERVICE_PATHS[name] ?? SERVICE_PATHS.map}</svg>;
}
