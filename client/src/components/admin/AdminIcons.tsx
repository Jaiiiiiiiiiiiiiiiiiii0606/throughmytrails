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

export const DashIcon = ({ size, ...p }: P) => <svg {...s(size)} {...p}><path d="M3 13h8V3H3zM13 21h8V11h-8zM3 21h8v-6H3zM13 3v6h8V3z" /></svg>;
export const InboxIcon = ({ size, ...p }: P) => <svg {...s(size)} {...p}><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.7 4H7.3a2 2 0 0 0-1.8 1.1z" /></svg>;
export const ImageIcon = ({ size, ...p }: P) => <svg {...s(size)} {...p}><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="9" cy="9" r="2" /><path d="m21 15-5-5L5 21" /></svg>;
export const GearIcon = ({ size, ...p }: P) => <svg {...s(size)} {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>;
export const LogoutIcon = ({ size, ...p }: P) => <svg {...s(size)} {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>;
export const ExternalIcon = ({ size, ...p }: P) => <svg {...s(size)} {...p}><path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></svg>;
export const MenuIcon = ({ size, ...p }: P) => <svg {...s(size)} {...p}><path d="M4 7h16M4 12h16M4 17h16" /></svg>;
export const CloseIcon = ({ size, ...p }: P) => <svg {...s(size)} {...p}><path d="M18 6 6 18M6 6l12 12" /></svg>;
export const SearchIcon = ({ size, ...p }: P) => <svg {...s(size)} {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>;
export const DownloadIcon = ({ size, ...p }: P) => <svg {...s(size)} {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>;
export const TrashIcon = ({ size, ...p }: P) => <svg {...s(size)} {...p}><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>;
export const CopyIcon = ({ size, ...p }: P) => <svg {...s(size)} {...p}><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>;
export const CheckIcon = ({ size, ...p }: P) => <svg {...s(size)} {...p}><path d="M20 6 9 17l-5-5" /></svg>;
export const UpIcon = ({ size, ...p }: P) => <svg {...s(size)} {...p}><path d="m18 15-6-6-6 6" /></svg>;
export const DownIcon = ({ size, ...p }: P) => <svg {...s(size)} {...p}><path d="m6 9 6 6 6-6" /></svg>;
export const PlusIcon = ({ size, ...p }: P) => <svg {...s(size)} {...p}><path d="M12 5v14M5 12h14" /></svg>;
export const UploadIcon = ({ size, ...p }: P) => <svg {...s(size)} {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" /></svg>;
export const RefreshIcon = ({ size, ...p }: P) => <svg {...s(size)} {...p}><path d="M21 12a9 9 0 1 1-2.6-6.4L21 8M21 3v5h-5" /></svg>;
export const EditIcon = ({ size, ...p }: P) => <svg {...s(size)} {...p}><path d="M12 20h9M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4Z" /></svg>;
export const MapPinIcon = ({ size, ...p }: P) => <svg {...s(size)} {...p}><path d="M12 21s-7-5.6-7-11a7 7 0 0 1 14 0c0 5.4-7 11-7 11Z" /><circle cx="12" cy="10" r="2.5" /></svg>;
export const SuitcaseIcon = ({ size, ...p }: P) => <svg {...s(size)} {...p}><rect x="3" y="7" width="18" height="13" rx="2.5" /><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18" /></svg>;
export const UsersIcon = ({ size, ...p }: P) => <svg {...s(size)} {...p}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6.5 6.5 0 0 1 3.5 5.5" /></svg>;
