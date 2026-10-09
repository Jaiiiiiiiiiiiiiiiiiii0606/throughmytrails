export const TRIP_SLOT_PREFIX = 'trip:';
export const TEAM_SLOT_PREFIX = 'team:';

const FIXED: Record<string, { label: string; help: string }> = {
  hero: { label: 'Hero photo', help: 'Shown as a round photo inside the rotating ring at the top of the page. Leave empty to show the logo.' },
  about: { label: 'About image', help: 'Beside “Every trail starts with a conversation”. Defaults to the business card.' },
  logo: { label: 'Logo', help: 'The one logo used everywhere: navigation bar, hero (when there is no hero photo), itinerary card and footer. Use a transparent PNG.' },
};

export function slotLabel(slot: string, tripTitles?: Map<string, string>, teamNames?: Map<string, string>): string {
  if (FIXED[slot]) return FIXED[slot].label;
  if (slot.startsWith(TEAM_SLOT_PREFIX)) {
    const key = slot.slice(TEAM_SLOT_PREFIX.length);
    return `Team: ${teamNames?.get(key) ?? key}`;
  }
  if (slot.startsWith(TRIP_SLOT_PREFIX)) {
    const key = slot.slice(TRIP_SLOT_PREFIX.length);
    return `Trip: ${tripTitles?.get(key) ?? key}`;
  }
  return slot;
}

export function slotHelp(slot: string): string {
  if (slot.startsWith(TEAM_SLOT_PREFIX)) return 'Portrait on this team card. A square or portrait photo works best. Leave empty to show initials.';
  return FIXED[slot]?.help ?? 'Photo at the top of this trip card. Leave empty to show the built-in illustration.';
}
