/**
 * Renders every email template with sample data into ./mail-preview/*.html (and .txt)
 * so you can tweak the .hbs files and refresh the browser. Needs MongoDB running (reads contact details).
 *
 *   npm run mail:preview
 */
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { mkdirSync, writeFileSync } from 'fs';
import { join, relative } from 'path';
import { AppModule } from '../app.module';
import { LOGO_PATH, MailEnquiry, MailService } from './mail.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  const mail = app.get(MailService);
  const out = join(process.cwd(), 'mail-preview');
  mkdirSync(out, { recursive: true });
  const logoSrc = relative(out, LOGO_PATH);

  const sample: MailEnquiry = {
    id: '000000000000000000000000',
    referenceId: `TMT-${new Date().getFullYear()}-0042`,
    name: 'Aarav Mehta',
    email: 'aarav@example.com',
    phone: '+91 98765 43210',
    destination: 'Spiti Valley',
    travelDates: 'Mid-June 2027',
    travellers: 2,
    budget: '50k-1l',
    tripType: 'mountains',
    message: 'We love slow mornings, homestays and local food.\nOne of us is vegetarian.',
    source: 'form',
    createdAt: new Date(),
  };

  const files: [string, Awaited<ReturnType<MailService['buildTest']>>][] = [
    ['enquiry-confirmation', await mail.buildUserConfirmation(sample, { logoSrc })],
    ['admin-new-enquiry', await mail.buildAdminAlert(sample, { logoSrc })],
    ['test-email', await mail.buildTest('admin@example.com', { logoSrc })],
  ];
  for (const [name, m] of files) {
    writeFileSync(join(out, `${name}.html`), m.html);
    writeFileSync(join(out, `${name}.txt`), `Subject: ${m.subject}\n\n${m.text}`);
    console.log(`✓ ${join('mail-preview', name)}.html  (${m.subject})`);
  }
  await app.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
