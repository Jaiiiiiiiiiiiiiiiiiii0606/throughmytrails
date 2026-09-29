import type { Illustration } from '../../lib/constants';

/** Built-in trip-card artwork from the original site, used when no image is assigned to the slot. */
export function TripIllustration({ kind, className }: { kind: Illustration; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 360 240" width="100%" aria-hidden="true" focusable="false">
      <rect width="360" height="240" fill="#F1E7D7" />
      {ART[kind] ?? ART.mountains}
    </svg>
  );
}

const ART: Record<Illustration, JSX.Element> = {
  mountains: (
    <>
      <circle cx="270" cy="62" r="22" fill="#B08654" />
      <path d="M0 190 L90 90 L130 130 L185 60 L260 150 L300 120 L360 180 V240 H0 Z" fill="#3B2B1F" />
      <path d="M185 60 L200 80 L190 78 L183 88 L175 78 L168 82 Z M90 90 L102 104 L94 102 L88 110 L82 102 Z" fill="#F1E7D7" />
      <path d="M170 240 C 160 215, 215 205, 195 185 C 180 170, 220 160, 230 150" stroke="#D9C9AE" strokeWidth="9" fill="none" strokeLinecap="round" />
      <g fill="#6E5840">
        <path d="M320 240 L320 160 L302 196 L314 194 L296 226 L312 222 L292 240 Z M320 160 L338 196 L326 194 L344 226 L328 222 L348 240 Z" />
      </g>
    </>
  ),
  beaches: (
    <>
      <circle cx="110" cy="80" r="30" fill="#B08654" />
      <g stroke="#B08654" strokeWidth="2.5" strokeLinecap="round">
        <path d="M110 30 V40 M160 80 H150 M60 80 H70 M145 45 L138 52 M75 45 L82 52" />
      </g>
      <path d="M0 180 C60 170 120 185 180 176 C240 168 300 182 360 174 V240 H0 Z" fill="#D9C9AE" />
      <g fill="none" stroke="#3B2B1F" strokeWidth="3" strokeLinecap="round">
        <path d="M20 205 q15 -10 30 0 q15 10 30 0 q15 -10 30 0" />
        <path d="M150 220 q15 -10 30 0 q15 10 30 0 q15 -10 30 0" />
        <path d="M250 198 q15 -10 30 0 q15 10 30 0" />
      </g>
      <g fill="#3B2B1F">
        <path d="M258 178 C258 140 262 110 272 82 L277 83 C268 110 265 140 266 178 Z" />
        <path d="M275 82 q-44 -4 -62 24 q32 -16 62 -14 Z M275 82 q40 -8 62 16 q-32 -12 -62 -8 Z M275 82 q-12 -32 -44 -42 q26 16 40 46 Z M275 82 q16 -30 48 -34 q-28 12 -44 38 Z" />
      </g>
    </>
  ),
  cities: (
    <>
      <circle cx="290" cy="60" r="20" fill="#B08654" />
      <g fill="#3B2B1F">
        <rect x="40" y="130" width="46" height="90" />
        <rect x="92" y="90" width="40" height="130" />
        <rect x="138" y="50" width="46" height="170" />
        <rect x="158" y="26" width="6" height="24" />
        <rect x="190" y="110" width="36" height="110" />
        <rect x="232" y="140" width="50" height="80" />
        <rect x="288" y="120" width="34" height="100" />
      </g>
      <g fill="#D9C9AE">
        {[
          [146, 64], [166, 64], [146, 86], [166, 86], [146, 108], [166, 108],
          [100, 104], [116, 104], [100, 126], [116, 126], [198, 126], [212, 126],
        ].map(([x, y]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width="8" height="10" />
        ))}
      </g>
      <rect y="220" width="360" height="20" fill="#D9C9AE" />
    </>
  ),
  backpacking: (
    <>
      <path d="M0 190 C60 170 110 150 160 160 C210 170 260 200 360 195 V240 H0 Z" fill="#D9C9AE" />
      <path d="M150 160 C 200 175, 230 200, 280 196 S 330 185, 360 190" fill="none" stroke="#3B2B1F" strokeWidth="2.5" strokeDasharray="7 7" strokeLinecap="round" />
      <path d="M290 150 a14 14 0 1 1 28 0 c0 12 -14 26 -14 26 s-14 -14 -14 -26 Z" fill="#3B2B1F" />
      <circle cx="304" cy="150" r="5" fill="#F1E7D7" />
      <g fill="#3B2B1F" stroke="#3B2B1F" strokeLinecap="round">
        <circle cx="118" cy="82" r="9" stroke="none" />
        <rect x="96" y="96" width="16" height="30" rx="4" stroke="none" />
        <path d="M118 96 L114 128 L104 158 M114 128 L128 156 M118 102 L132 122" strokeWidth="9" fill="none" />
        <path d="M110 74 h18" strokeWidth="4" />
      </g>
    </>
  ),
  sea: (
    <>
      <circle cx="80" cy="70" r="24" fill="#B08654" />
      <g fill="none" stroke="#B08654" strokeWidth="2.5" strokeLinecap="round">
        <path d="M240 60 q6 -6 12 0 q6 -6 12 0" />
        <path d="M270 84 q5 -5 10 0 q5 -5 10 0" />
      </g>
      <g fill="#3B2B1F">
        <path d="M180 50 L180 170 L120 170 Z" />
        <path d="M186 70 L186 170 L232 170 Z" />
        <path d="M110 178 H250 L230 202 H132 Z" />
      </g>
      <g fill="none" stroke="#3B2B1F" strokeWidth="3" strokeLinecap="round">
        <path d="M60 212 q20 -10 40 0 q20 10 40 0 q20 -10 40 0 q20 10 40 0 q20 -10 40 0 q20 10 40 0" />
        <path d="M100 228 q20 -10 40 0 q20 10 40 0 q20 -10 40 0" />
      </g>
    </>
  ),
  scenic: (
    <>
      <path d="M0 200 C80 170 160 190 240 175 C300 165 340 175 360 172 V240 H0 Z" fill="#D9C9AE" />
      <g>
        <ellipse cx="130" cy="80" rx="36" ry="42" fill="#3B2B1F" />
        <path d="M130 38 C118 60 118 100 130 122 M130 38 C142 60 142 100 130 122" stroke="#F1E7D7" strokeWidth="2" fill="none" />
        <path d="M104 110 L120 140 M156 110 L140 140" stroke="#3B2B1F" strokeWidth="2" />
        <rect x="118" y="140" width="24" height="16" rx="3" fill="#3B2B1F" />
      </g>
      <g>
        <ellipse cx="260" cy="110" rx="22" ry="26" fill="#B08654" />
        <path d="M244 128 L254 146 M276 128 L266 146" stroke="#B08654" strokeWidth="2" />
        <rect x="253" y="146" width="14" height="10" rx="2" fill="#B08654" />
      </g>
      <path d="M200 50 c-6 -8 -18 -2 -12 8 l12 12 l12 -12 c6 -10 -6 -16 -12 -8 Z" fill="none" stroke="#8A6440" strokeWidth="2" />
    </>
  ),
};
