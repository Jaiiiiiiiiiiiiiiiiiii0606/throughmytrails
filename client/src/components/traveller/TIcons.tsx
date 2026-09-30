import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement> & { size?: number };
const s = (size = 20): SVGProps<SVGSVGElement> => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
});

export const HeartIcon = ({ size, filled, ...p }: P & { filled?: boolean }) => (
  <svg {...s(size)} {...p} fill={filled ? 'currentColor' : 'none'}>
    <path d="M19.5 12.6 12 20l-7.5-7.4A5 5 0 1 1 12 6.1a5 5 0 1 1 7.5 6.5Z" />
  </svg>
);
export const SearchIcon = ({ size, ...p }: P) => <svg {...s(size)} {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>;
export const PinIcon = ({ size, ...p }: P) => <svg {...s(size)} {...p}><path d="M12 21s-7-5.6-7-11a7 7 0 0 1 14 0c0 5.4-7 11-7 11Z" /><circle cx="12" cy="10" r="2.5" /></svg>;
export const SoundOnIcon = ({ size, ...p }: P) => <svg {...s(size)} {...p}><path d="M11 5 6 9H3v6h3l5 4V5Z" /><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" /></svg>;
export const SoundOffIcon = ({ size, ...p }: P) => <svg {...s(size)} {...p}><path d="M11 5 6 9H3v6h3l5 4V5Z" /><path d="m22 9-6 6M16 9l6 6" /></svg>;
export const ChevronLeft = ({ size, ...p }: P) => <svg {...s(size)} {...p}><path d="m15 18-6-6 6-6" /></svg>;
export const ChevronRight = ({ size, ...p }: P) => <svg {...s(size)} {...p}><path d="m9 18 6-6-6-6" /></svg>;
export const ChevronDown = ({ size, ...p }: P) => <svg {...s(size)} {...p}><path d="m6 9 6 6 6-6" /></svg>;
export const UserIcon = ({ size, ...p }: P) => <svg {...s(size)} {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>;
export const CalendarIcon = ({ size, ...p }: P) => <svg {...s(size)} {...p}><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M16 3v4M8 3v4M3 11h18" /></svg>;
export const MoonIcon = ({ size, ...p }: P) => <svg {...s(size)} {...p}><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" /></svg>;
export const UsersIcon = ({ size, ...p }: P) => <svg {...s(size)} {...p}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6.5 6.5 0 0 1 3.5 5.5" /></svg>;
export const CheckIcon = ({ size, ...p }: P) => <svg {...s(size)} {...p}><path d="M20 6 9 17l-5-5" /></svg>;
export const MinusIcon = ({ size, ...p }: P) => <svg {...s(size)} {...p}><path d="M5 12h14" /></svg>;
export const PlusIcon = ({ size, ...p }: P) => <svg {...s(size)} {...p}><path d="M12 5v14M5 12h14" /></svg>;
export const SparkIcon = ({ size, ...p }: P) => <svg {...s(size)} {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" /></svg>;
export const PlaneIcon = ({ size, ...p }: P) => <svg {...s(size)} {...p}><path d="M10.5 13.5 3 11l1.5-1.5 7 1 4-4.5c1-1 2.8-1.6 3.5-.9.7.7.1 2.5-.9 3.5l-4.5 4 1 7L13 21l-2.5-7.5Z" /></svg>;
export const ShieldIcon = ({ size, ...p }: P) => <svg {...s(size)} {...p}><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z" /><path d="m9 12 2 2 4-4" /></svg>;
export const LogoutIcon = ({ size, ...p }: P) => <svg {...s(size)} {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>;
export const ArrowRightIcon = ({ size, ...p }: P) => <svg {...s(size)} {...p}><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
export const ArrowLeftIcon = ({ size, ...p }: P) => <svg {...s(size)} {...p}><path d="M19 12H5M11 6l-6 6 6 6" /></svg>;
export const SunIcon = ({ size, ...p }: P) => <svg {...s(size)} {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>;
export const PassportIcon = ({ size, ...p }: P) => <svg {...s(size)} {...p}><rect x="5" y="3" width="14" height="18" rx="2" /><circle cx="12" cy="10" r="3" /><path d="M9 16h6" /></svg>;
export const PlayIcon = ({ size, ...p }: P) => <svg {...s(size)} {...p}><path d="M7 5v14l12-7L7 5Z" /></svg>;
