import type { PublicSiteContent } from '../api/types';

/** Mirrors the server seed. Used before the API responds and as an offline fallback. */
export const DEFAULT_SITE_CONTENT: PublicSiteContent = {
  images: { hero: null, about: null, logo: null },
  tripTypes: [
    { key: 'mountains', title: 'Mountains & treks', subtitle: 'Peaks, trails and cosy stays with a view.', whatsappMessage: 'Hi Through My Trails, I want to plan a mountain trip.', illustration: 'mountains', image: null },
    { key: 'beaches', title: 'Beaches & islands', subtitle: 'Sand, sea and sunsets on repeat.', whatsappMessage: 'Hi Through My Trails, I want to plan a beach trip.', illustration: 'beaches', image: null },
    { key: 'cities', title: 'City breaks', subtitle: 'Food streets, skylines and hidden corners.', whatsappMessage: 'Hi Through My Trails, I want to plan a city break.', illustration: 'cities', image: null },
    { key: 'backpacking', title: 'Backpacking', subtitle: 'Go far on a smart, budget-first route.', whatsappMessage: 'Hi Through My Trails, I want to plan a backpacking trip.', illustration: 'backpacking', image: null },
    { key: 'sea', title: 'Sail & sea', subtitle: 'Cruises, coastlines and island hopping.', whatsappMessage: 'Hi Through My Trails, I want to plan a sea holiday.', illustration: 'sea', image: null },
    { key: 'scenic', title: 'Scenic escapes', subtitle: 'Honeymoons, getaways and views to remember.', whatsappMessage: 'Hi Through My Trails, I want to plan a honeymoon or scenic getaway.', illustration: 'scenic', image: null },
  ],
  services: [
    { icon: 'flight', title: 'Flight assistance', description: "The right routes, timings and fares, compared for you so you don't have to." },
    { icon: 'hotel', title: 'Hotel selection', description: 'Handpicked stays in the right neighbourhoods, matched to your comfort and budget.' },
    { icon: 'map', title: 'Custom itineraries', description: 'A day-wise plan of places, food and experiences, paced the way you like to travel.' },
    { icon: 'wallet', title: 'Budget planning', description: 'A clear cost breakdown up front, and smart swaps to make your money go further.' },
  ],
  contact: {
    phone: '+91 74892 67159',
    whatsapp: '917489267159',
    email: 'throughmytrails@gmail.com',
    instagram: 'through.my.trails',
  },
};
