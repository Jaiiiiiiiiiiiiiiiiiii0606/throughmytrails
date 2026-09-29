import { NestExpressApplication } from '@nestjs/platform-express';
import { getConnectionToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { rmSync } from 'fs';
import { Connection } from 'mongoose';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { EnquiriesService } from '../src/enquiries/enquiries.service';
import { MailService } from '../src/mail/mail.service';

describe('Through My Trails API (e2e)', () => {
  let app: NestExpressApplication;
  let http: ReturnType<NestExpressApplication['getHttpServer']>;
  const sendUserConfirmation = jest.fn().mockResolvedValue(undefined);
  const sendAdminAlert = jest.fn().mockRejectedValue(new Error('SMTP down'));

  const validEnquiry = {
    name: 'Priya Shah',
    email: 'Priya@Example.com',
    phone: '+91 98765 43210',
    destination: 'Kasol <script>alert(1)</script>',
    travelDates: 'December 2026',
    travellers: 2,
    budget: '25k-50k',
    tripType: 'mountains',
    message: 'Love the hills.',
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MailService)
      .useValue({ sendUserConfirmation, sendAdminAlert, onModuleInit: () => undefined })
      .compile();

    app = moduleRef.createNestApplication<NestExpressApplication>();
    configureApp(app);
    await moduleRef.get<Connection>(getConnectionToken()).dropDatabase();
    await app.init();
    http = app.getHttpServer();
  });

  afterAll(async () => {
    await app.get<Connection>(getConnectionToken()).dropDatabase();
    await app.close();
    rmSync('uploads-test', { recursive: true, force: true });
  });

  describe('POST /api/enquiries', () => {
    it('saves a valid enquiry, returns a reference id and sanitises input', async () => {
      const res = await request(http).post('/api/enquiries').send(validEnquiry).expect(201);
      expect(res.body.referenceId).toMatch(/^TMT-\d{4}-0001$/);
      expect(res.body.name).toBe('Priya Shah');

      // Emails are dispatched in the background; a failed admin email must not fail the request.
      await app.get(EnquiriesService).drainEmails();
      expect(sendUserConfirmation).toHaveBeenCalledWith(expect.objectContaining({ email: 'priya@example.com' }));

      const saved = await app
        .get<Connection>(getConnectionToken())
        .collection('enquiries')
        .findOne({ referenceId: res.body.referenceId });
      expect(saved?.destination).toBe('Kasol');
      expect(saved?.status).toBe('new');
      expect(saved?.emailStatus).toMatchObject({ user: 'sent', admin: 'failed' });
      expect(saved?.emailStatus.lastError).toContain('SMTP down');
    });

    it('rejects invalid input with a consistent error shape', async () => {
      const res = await request(http)
        .post('/api/enquiries')
        .send({ ...validEnquiry, email: 'not-an-email', budget: 'a lot' })
        .expect(400);
      expect(res.body).toMatchObject({ statusCode: 400, error: 'Bad Request', path: '/api/enquiries' });
      expect(res.body.message).toEqual(expect.any(String));
    });

    it('silently drops honeypot submissions', async () => {
      const res = await request(http)
        .post('/api/enquiries')
        .send({ ...validEnquiry, website: 'http://spam.example' })
        .expect(201);
      expect(res.body.referenceId).toBeNull();
      const count = await app.get<Connection>(getConnectionToken()).collection('enquiries').countDocuments();
      expect(count).toBe(1);
    });

    it('rate-limits to 5 enquiries per IP per 10 minutes', async () => {
      // 3 requests were made above; 2 more are allowed, the 6th is refused.
      await request(http).post('/api/enquiries').send(validEnquiry).expect(201);
      await request(http).post('/api/enquiries').send(validEnquiry).expect(201);
      const res = await request(http).post('/api/enquiries').send(validEnquiry).expect(429);
      expect(res.body.statusCode).toBe(429);
    });
  });

  describe('admin auth', () => {
    it('rejects a wrong password', async () => {
      await request(http).post('/api/auth/login').send({ email: 'admin@test.local', password: 'nope-nope-nope' }).expect(401);
    });

    it('blocks admin routes without a token', async () => {
      await request(http).get('/api/admin/enquiries').expect(401);
    });

    it('logs in, reads admin data, refreshes and logs out', async () => {
      const login = await request(http)
        .post('/api/auth/login')
        .send({ email: 'ADMIN@test.local', password: 'Test-password-123' })
        .expect(200);
      expect(login.body.accessToken).toEqual(expect.any(String));
      expect(login.body.user).toMatchObject({ email: 'admin@test.local', name: 'Test Admin' });
      const cookie = ([] as string[]).concat(login.headers['set-cookie'] ?? []).find((c) => c.startsWith('tmt_rt='));
      expect(cookie).toContain('HttpOnly');

      const list = await request(http)
        .get('/api/admin/enquiries?limit=10')
        .set('Authorization', `Bearer ${login.body.accessToken}`)
        .expect(200);
      expect(list.body.total).toBe(3);

      const refreshed = await request(http).post('/api/auth/refresh').set('Cookie', cookie!.split(';')[0]).expect(200);
      expect(refreshed.body.accessToken).toEqual(expect.any(String));

      // The old refresh token was rotated out and can't be reused.
      await request(http).post('/api/auth/refresh').set('Cookie', cookie!.split(';')[0]).expect(401);

      await request(http).post('/api/auth/logout').expect(200);
    });
  });
});
