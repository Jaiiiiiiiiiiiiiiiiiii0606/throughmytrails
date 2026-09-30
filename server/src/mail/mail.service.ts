import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { readdirSync, readFileSync } from 'fs';
import Handlebars from 'handlebars';
import { createTransport, Transporter } from 'nodemailer';
import { join } from 'path';
import { BUDGET_LABELS, Budget } from '../common/constants';
import { planRows } from '../common/plan-format';
import type { TripPlan } from '../enquiries/enquiry.schema';
import { APP_CONFIG, AppConfig } from '../config';
import { Contact } from '../site-content/site-content.schema';
import { SiteContentService } from '../site-content/site-content.service';

export const TEMPLATES_DIR = join(__dirname, 'templates');
export const LOGO_PATH = join(__dirname, 'assets', 'logo-email.png');
const LOGO_CID = 'logo@throughmytrails';

/** Fields the templates need; a subset of the Enquiry document. */
export interface MailEnquiry {
  id: string;
  referenceId: string;
  name: string;
  email: string;
  phone: string;
  destination: string;
  travelDates?: string;
  travellers?: number | null;
  budget?: Budget | string | null;
  tripType?: string;
  message?: string;
  source?: string;
  createdAt?: Date;
  plan?: TripPlan | null;
}

const SOURCE_LABELS: Record<string, string> = {
  form: 'website enquiry form',
  'trip-card': 'trip card on the website',
  planner: 'trip planner (signed-in traveller)',
  package: 'package page (signed-in traveller)',
};

export interface RenderedMail {
  subject: string;
  html: string;
  text: string;
}

const DASH = '—';

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private readonly hbs = Handlebars.create();
  private templates = new Map<string, Handlebars.TemplateDelegate>();
  private transporter?: Transporter;

  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly content: SiteContentService,
  ) {}

  onModuleInit() {
    this.loadTemplates();
    const { host, port, user, pass } = this.config.smtp;
    if (user && pass) {
      this.transporter = createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
        pool: true,
        maxConnections: 3,
      });
    } else {
      this.logger.warn('SMTP_USER / SMTP_PASS not set: emails will be marked as failed until configured.');
    }
  }

  get isConfigured() {
    return !!this.transporter;
  }

  /** Compiles every .hbs file; partials live in templates/partials. */
  loadTemplates(dir = TEMPLATES_DIR) {
    const partialsDir = join(dir, 'partials');
    for (const f of readdirSync(partialsDir).filter((f) => f.endsWith('.hbs'))) {
      this.hbs.registerPartial(f.replace(/\.hbs$/, ''), readFileSync(join(partialsDir, f), 'utf8'));
    }
    for (const f of readdirSync(dir).filter((f) => f.endsWith('.hbs'))) {
      const name = f.replace(/\.hbs$/, '');
      const isText = name.endsWith('.txt');
      this.templates.set(name, this.hbs.compile(readFileSync(join(dir, f), 'utf8'), { noEscape: isText, strict: false }));
    }
  }

  render(name: string, ctx: Record<string, unknown>, opts: { logoSrc?: string } = {}): Omit<RenderedMail, 'subject'> {
    const html = this.templates.get(name);
    const text = this.templates.get(`${name}.txt`);
    if (!html || !text) throw new Error(`Email template "${name}" is missing.`);
    const full = { ...ctx, logoSrc: opts.logoSrc ?? `cid:${LOGO_CID}` };
    return { html: html(full), text: text(full) };
  }

  private contactView(c: Contact) {
    return { ...c, phoneHref: c.phone.replace(/[^\d+]/g, '') };
  }

  private async enquiryView(e: MailEnquiry) {
    const doc = await this.content.getDoc();
    const trip = doc.tripTypes.find((t) => t.key === e.tripType);
    return {
      ...e,
      travelDates: e.travelDates || DASH,
      travellers: e.travellers ? String(e.travellers) : DASH,
      budget: (e.budget && BUDGET_LABELS[e.budget as Budget]) || DASH,
      tripType: trip?.title ?? (e.tripType === 'other' ? 'Something else' : e.tripType || DASH),
      message: e.message || DASH,
      sourceLabel: SOURCE_LABELS[e.source ?? 'form'] ?? SOURCE_LABELS.form,
      planRows: e.plan ? planRows(e.plan) : [],
    };
  }

  firstName(name: string) {
    return (name.trim().split(/\s+/)[0] || 'traveller').replace(/[\r\n]/g, '');
  }

  private formatDate(d: Date) {
    return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }).format(d);
  }

  private get adminBaseUrl() {
    return this.config.clientUrls[0] ?? 'http://localhost:5173';
  }

  private get siteUrl() {
    return this.adminBaseUrl;
  }

  async buildLoginCode(code: string, minutes: number, opts?: { logoSrc?: string }): Promise<RenderedMail> {
    const contact = await this.content.getContact();
    const ctx = {
      subject: `${code} is your Through My Trails sign-in code`,
      preheader: `Enter ${code} to sign in. It expires in ${minutes} minutes.`,
      code,
      digits: code.split(''),
      minutes,
      contact: this.contactView(contact),
      footerNote: `Someone (hopefully you) asked to sign in to Through My Trails with this email. If it wasn't you, you can ignore this email.`,
    };
    return { subject: ctx.subject, ...this.render('login-code', ctx, opts) };
  }

  async buildWelcome(u: { email: string; name?: string }, opts?: { logoSrc?: string }): Promise<RenderedMail> {
    const contact = await this.content.getContact();
    const firstName = u.name ? this.firstName(u.name) : 'traveller';
    const ctx = {
      subject: `Welcome aboard, ${firstName} ✈ — Through My Trails`,
      preheader: 'Your account is ready. Explore destinations, plan a trip in two minutes, and track every request in one place.',
      firstName,
      planUrl: `${this.siteUrl}/plan`,
      exploreUrl: `${this.siteUrl}/explore`,
      accountUrl: `${this.siteUrl}/account`,
      whatsappUrl: `https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(`Hi Through My Trails, I just signed up as ${u.email}.`)}`,
      perks: [
        { icon: '✦', title: 'Explore destinations', text: 'Hover over a place to hear and see it. Save the ones that tug at you.' },
        { icon: '✎', title: 'Plan in two minutes', text: 'Tell us who, when and how you like to travel. A real planner builds your day-wise itinerary.' },
        { icon: '✓', title: 'Track every trip', text: 'Your requests, their status and your saved places live in your profile.' },
      ],
      contact: this.contactView(contact),
      footerNote: `You're receiving this because you created a Through My Trails account with ${u.email}.`,
    };
    return { subject: ctx.subject, ...this.render('welcome', ctx, opts) };
  }

  async sendLoginCode(to: string, code: string, minutes: number) {
    await this.send(to, await this.buildLoginCode(code, minutes));
  }

  async sendWelcome(u: { email: string; name?: string }) {
    const contact = await this.content.getContact();
    await this.send(u.email, await this.buildWelcome(u), contact.email);
  }

  async buildUserConfirmation(e: MailEnquiry, opts?: { logoSrc?: string }): Promise<RenderedMail> {
    const contact = await this.content.getContact();
    const firstName = this.firstName(e.name);
    const waText = `Hi Through My Trails, this is ${firstName}. My enquiry reference is ${e.referenceId}.`;
    const ctx = {
      subject: `We've received your enquiry, ${firstName} ✈ — Through My Trails`,
      preheader: `Reference ${e.referenceId}: we'll be in touch within 24 hours to start planning your trip.`,
      firstName,
      enquiry: await this.enquiryView(e),
      contact: this.contactView(contact),
      whatsappUrl: `https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(waText)}`,
      instagramUrl: `https://www.instagram.com/${contact.instagram}`,
      steps: [
        { n: 1, title: 'We review your details.', text: 'A real travel planner reads your enquiry and notes what matters to you.' },
        { n: 2, title: 'We research flights, hotels and experiences.', text: 'Options are compared and shortlisted so you skip the tab-hopping.' },
        { n: 3, title: 'You receive a personalised day-wise itinerary', text: 'with a clear budget breakdown, tweaked until it feels just right.' },
      ],
      footerNote: `You're receiving this because you sent an enquiry on our website. Reply to this email any time.`,
      tripsUrl: e.plan ? `${this.siteUrl}/account` : null,
    };
    return { subject: ctx.subject, ...this.render('enquiry-confirmation', ctx, opts) };
  }

  async buildAdminAlert(e: MailEnquiry, opts?: { logoSrc?: string }): Promise<RenderedMail> {
    const contact = await this.content.getContact();
    const view = await this.enquiryView(e);
    const digits = e.phone.replace(/\D/g, '');
    const waDigits = digits.length === 10 ? `91${digits}` : digits;
    const ctx = {
      subject: `New enquiry ${e.referenceId} · ${e.name} → ${e.destination}`.replace(/[\r\n]/g, ' '),
      preheader: `${e.name} wants to go to ${e.destination}. ${view.travelDates} · ${view.budget}`,
      enquiry: view,
      receivedAt: this.formatDate(e.createdAt ?? new Date()),
      adminUrl: `${this.adminBaseUrl}/admin/enquiries/${e.id}`,
      callHref: `tel:${e.phone.replace(/[^\d+]/g, '')}`,
      whatsappDirectUrl: `https://wa.me/${waDigits}?text=${encodeURIComponent(`Hi ${this.firstName(e.name)}, this is Through My Trails about your enquiry ${e.referenceId}.`)}`,
      contact: this.contactView(contact),
    };
    return { subject: ctx.subject, ...this.render('admin-new-enquiry', ctx, opts) };
  }

  async buildTest(sentBy: string, opts?: { logoSrc?: string }): Promise<RenderedMail> {
    const contact = await this.content.getContact();
    const ctx = {
      subject: 'Test email ✈ — Through My Trails',
      preheader: 'Your email settings are working.',
      sentAt: this.formatDate(new Date()),
      sentBy,
      contact: this.contactView(contact),
    };
    return { subject: ctx.subject, ...this.render('test-email', ctx, opts) };
  }

  /** Sends a rendered email. Throws on failure so callers can record the error. */
  async send(to: string, mail: RenderedMail, replyTo?: string): Promise<void> {
    if (!this.transporter) throw new Error('SMTP is not configured (set SMTP_USER and SMTP_PASS).');
    await this.transporter.sendMail({
      from: this.config.smtp.from,
      to,
      replyTo,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      attachments: [{ filename: 'through-my-trails.png', path: LOGO_PATH, cid: LOGO_CID }],
    });
  }

  async sendUserConfirmation(e: MailEnquiry) {
    const contact = await this.content.getContact();
    await this.send(e.email, await this.buildUserConfirmation(e), contact.email);
  }

  async sendAdminAlert(e: MailEnquiry) {
    await this.send(this.config.adminNotifyEmail, await this.buildAdminAlert(e), e.email);
  }

  async sendTest(to: string, sentBy: string) {
    await this.send(to, await this.buildTest(sentBy));
  }
}
