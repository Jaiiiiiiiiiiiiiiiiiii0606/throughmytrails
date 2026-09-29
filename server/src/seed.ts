/**
 * Seeds the database:
 *   • the admin user from ADMIN_EMAIL / ADMIN_PASSWORD (skipped if it exists)
 *   • default site content: trip types, services, contact (skipped if it exists)
 *   • 15 realistic sample enquiries (only when there are no enquiries yet; use --force to add anyway)
 *
 *   npm run seed            # safe to run repeatedly
 *   npm run seed -- --force # add another 15 sample enquiries
 */
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AdminUsersService } from './admin-users/admin-users.service';
import { AppModule } from './app.module';
import { Budget, EnquiryStatus } from './common/constants';
import { EnquiriesService } from './enquiries/enquiries.service';
import { Enquiry, EnquiryDocument } from './enquiries/enquiry.schema';
import { SiteContentService } from './site-content/site-content.service';

type Sample = {
  name: string;
  email: string;
  phone: string;
  destination: string;
  travelDates: string;
  travellers: number;
  budget: Budget;
  tripType: string;
  message: string;
  status: EnquiryStatus;
  daysAgo: number;
  source: 'form' | 'trip-card';
  notes?: string[];
};

const SAMPLES: Sample[] = [
  { name: 'Aarav Mehta', email: 'aarav.mehta@example.com', phone: '+91 98201 44871', destination: 'Spiti Valley', travelDates: 'June 2027', travellers: 2, budget: '50k-1l', tripType: 'mountains', message: 'Looking for homestays and a slow pace. One of us gets altitude sickness.', status: 'new', daysAgo: 0, source: 'trip-card' },
  { name: 'Diya Kulkarni', email: 'diya.k@example.com', phone: '+91 99300 11245', destination: 'Bali', travelDates: '12–19 Dec 2026', travellers: 2, budget: '1l-2l', tripType: 'scenic', message: 'Honeymoon! Would love a villa with a private pool for a couple of nights.', status: 'contacted', daysAgo: 1, source: 'trip-card', notes: ['Called Diya, prefers Ubud + Seminyak split. Sending options Friday.'] },
  { name: 'Rohan Sharma', email: 'rohan.sharma@example.com', phone: '+91 97111 30982', destination: 'Goa', travelDates: 'New Year week', travellers: 6, budget: '25k-50k', tripType: 'beaches', message: 'Group of friends, want a place near Anjuna. Budget is per person.', status: 'new', daysAgo: 1, source: 'form' },
  { name: 'Ishita Rao', email: 'ishita.rao@example.com', phone: '+91 90040 55321', destination: 'Manali', travelDates: 'Mid-January 2027', travellers: 4, budget: '50k-1l', tripType: 'mountains', message: 'Family trip with two kids (8 and 11). Want to see snow.', status: 'itinerary_sent', daysAgo: 3, source: 'form', notes: ['Shared 6-day draft with Solang + Sethan snow day.', 'They asked to swap the Kasol day for Naggar.'] },
  { name: 'Kabir Anand', email: 'kabir.anand@example.com', phone: '+91 98450 77310', destination: 'Vietnam', travelDates: 'March 2027, ~12 days', travellers: 1, budget: '50k-1l', tripType: 'backpacking', message: 'Solo, hostels are fine. North to south if possible.', status: 'booked', daysAgo: 5, source: 'trip-card', notes: ['Booked Hanoi → Ho Chi Minh route, flights confirmed.'] },
  { name: 'Meera Iyer', email: 'meera.iyer@example.com', phone: '+91 94440 26718', destination: 'Kerala', travelDates: 'Oct 2026', travellers: 3, budget: '50k-1l', tripType: 'scenic', message: 'Houseboat in Alleppey is a must. Travelling with my parents.', status: 'booked', daysAgo: 6, source: 'form', notes: ['Confirmed Kumarakom houseboat + Munnar 2N.'] },
  { name: 'Arjun Nair', email: 'arjun.nair@example.com', phone: '+91 98950 60213', destination: 'Andaman Islands', travelDates: 'Feb 2027', travellers: 2, budget: '1l-2l', tripType: 'sea', message: 'Scuba diving at Havelock. First-time divers.', status: 'contacted', daysAgo: 8, source: 'trip-card' },
  { name: 'Sanya Kapoor', email: 'sanya.kapoor@example.com', phone: '+91 98110 90345', destination: 'Paris & Amsterdam', travelDates: 'May 2027', travellers: 2, budget: '2l-plus', tripType: 'cities', message: 'Art museums, cafes and a day trip to the tulip fields.', status: 'itinerary_sent', daysAgo: 10, source: 'form' },
  { name: 'Vihaan Joshi', email: 'vihaan.joshi@example.com', phone: '+91 90219 44120', destination: 'Rishikesh', travelDates: 'This weekend', travellers: 3, budget: 'lt25k', tripType: 'backpacking', message: 'Rafting + camping, super short notice sorry!', status: 'closed_lost', daysAgo: 12, source: 'form', notes: ['Could not get rafting slots for the dates; they went elsewhere.'] },
  { name: 'Ananya Gupta', email: 'ananya.gupta@example.com', phone: '+91 99873 21654', destination: 'Ladakh', travelDates: 'August 2027', travellers: 5, budget: '1l-2l', tripType: 'mountains', message: 'Road trip, want to include Pangong and Nubra.', status: 'new', daysAgo: 13, source: 'trip-card' },
  { name: 'Reyansh Patel', email: 'reyansh.patel@example.com', phone: '+91 97250 88903', destination: 'Dubai', travelDates: 'Diwali break', travellers: 4, budget: '1l-2l', tripType: 'cities', message: 'Desert safari and theme parks for the kids.', status: 'booked', daysAgo: 16, source: 'form' },
  { name: 'Tara Menon', email: 'tara.menon@example.com', phone: '+91 95671 30098', destination: 'Maldives', travelDates: 'Anniversary, 20 Nov', travellers: 2, budget: '2l-plus', tripType: 'beaches', message: 'Overwater villa, all-inclusive preferred.', status: 'contacted', daysAgo: 19, source: 'trip-card' },
  { name: 'Aditya Verma', email: 'aditya.verma@example.com', phone: '+91 98300 71265', destination: 'Meghalaya', travelDates: 'Monsoon 2027', travellers: 2, budget: '25k-50k', tripType: 'scenic', message: 'Living root bridges and waterfalls. Happy to trek.', status: 'itinerary_sent', daysAgo: 22, source: 'form' },
  { name: 'Nisha Reddy', email: 'nisha.reddy@example.com', phone: '+91 90000 47812', destination: 'Goa', travelDates: 'Christmas', travellers: 2, budget: '25k-50k', tripType: 'beaches', message: 'Quiet South Goa please, no party beaches.', status: 'closed_lost', daysAgo: 25, source: 'form' },
  { name: 'Kiaan Bhatia', email: 'kiaan.bhatia@example.com', phone: '+91 98765 01928', destination: 'Greek Islands', travelDates: 'Sept 2027', travellers: 2, budget: '2l-plus', tripType: 'sea', message: 'Santorini + Milos, maybe a small sailing day trip.', status: 'new', daysAgo: 28, source: 'trip-card' },
];

async function main() {
  const force = process.argv.includes('--force');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn', 'log'] });

  await app.get(AdminUsersService).ensureSeedAdmin();
  await app.get(SiteContentService).getDoc();
  console.log('✓ Admin user and site content ready');

  const enquiries = app.get(EnquiriesService);
  const model = app.get<Model<EnquiryDocument>>(getModelToken(Enquiry.name));
  const existing = await model.countDocuments();
  if (existing > 0 && !force) {
    console.log(`• ${existing} enquiries already exist; skipping samples (use --force to add more)`);
  } else {
    const author = process.env.ADMIN_NAME || 'Admin';
    // Oldest first so reference numbers increase with time.
    for (const s of [...SAMPLES].sort((a, b) => b.daysAgo - a.daysAgo)) {
      const created = new Date(Date.now() - s.daysAgo * 86_400_000 - Math.floor(Math.random() * 8 * 3_600_000));
      await model.create({
        referenceId: await enquiries.nextReferenceId(created),
        name: s.name,
        email: s.email,
        phone: s.phone,
        destination: s.destination,
        travelDates: s.travelDates,
        travellers: s.travellers,
        budget: s.budget,
        tripType: s.tripType,
        message: s.message,
        status: s.status,
        source: s.source,
        notes: (s.notes ?? []).map((text, i) => ({ text, author, createdAt: new Date(created.getTime() + (i + 1) * 5 * 3_600_000) })),
        emailStatus: { user: 'sent', admin: 'sent', userSentAt: created, adminSentAt: created },
        ip: '127.0.0.1',
        userAgent: 'seed-script',
        createdAt: created,
        updatedAt: created,
      });
    }
    console.log(`✓ Added ${SAMPLES.length} sample enquiries`);
  }

  await app.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
