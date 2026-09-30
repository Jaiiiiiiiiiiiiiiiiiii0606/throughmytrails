export const TRIP_SLOT_PREFIX = 'trip:';

const FIXED: Record<string, { label: string; help: string }> = {
  hero: { label: 'Hero photo', help: 'Shown as a round photo inside the rotating ring at the top of the page. Leave empty to show the logo.' },
  about: { label: 'About image', help: 'Beside “Every trail starts with a conversation”. Defaults to the business card.' },
  logo: { label: 'Logo', help: 'Full logo used in the hero (when there is no hero photo) and the footer. Use a transparent PNG.' },
};

const COMPANION_NAMES: Record<string, string> = { couple: 'Couple', family: 'Family', friends: 'Friends', solo: 'Solo', seniors: 'Seniors' };
export const COMPANION_SLOT_PREFIX = 'companion:';

export function slotLabel(slot: string, tripTitles?: Map<string, string>): string {
  if (FIXED[slot]) return FIXED[slot].label;
  if (slot.startsWith(COMPANION_SLOT_PREFIX)) return `Who's coming: ${COMPANION_NAMES[slot.slice(COMPANION_SLOT_PREFIX.length)] ?? slot}`;
  if (slot.startsWith('destination:')) return `Destination: ${slot.slice(12)}`;
  if (slot.startsWith('package:')) return `Package: ${slot.slice(8)}`;
  if (slot.startsWith(TRIP_SLOT_PREFIX)) {
    const key = slot.slice(TRIP_SLOT_PREFIX.length);
    return `Trip: ${tripTitles?.get(key) ?? key}`;
  }
  return slot;
}

export function slotHelp(slot: string): string {
  if (slot.startsWith(COMPANION_SLOT_PREFIX)) return "Round photo in the “Who's coming along” row. Real traveller photos work best (with their permission).";
  return FIXED[slot]?.help ?? 'Photo at the top of this trip card. Leave empty to show the built-in illustration.';
}
