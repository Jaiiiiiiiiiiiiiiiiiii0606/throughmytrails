# Through My Trails

Personalised travel planning by **Nachiket R. Patil**. *Explore · Experience · Everywhere.*

This repository contains:

| Folder | What it is |
|---|---|
| `client/` | React 18 + TypeScript + Vite. The public website (a faithful port of the original static design and its scroll animations) and the admin panel at `/admin`. |
| `server/` | NestJS 10 + MongoDB (Mongoose) API: enquiries, branded emails, media uploads, site content, JWT auth, stats. |
| `docker-compose.yml` | A local MongoDB 7 instance. |

```
client/src
  api/          fetch client (token refresh), React Query hooks, types
  auth/         admin session context
  components/   public/ (site sections), admin/ (layout, dialogs, toasts), illustrations/ (SVG art, icons)
  hooks/        scroll engine: useReveal, useScrollProgress, useParallax, usePinnedScroll, useTimelineFill, useZoomOnScroll, useFlightPath
  pages/        public/HomePage, admin/{Login,Dashboard,Enquiries,Media,Settings}
  theme/        tokens.css (brand), site.css (public), admin.css
server/src
  auth/  admin-users/  enquiries/  mail/ (templates/*.hbs)  media/  site-content/  stats/  settings/  common/
  seed.ts       admin + default content + 15 sample enquiries
server/test     Supertest e2e tests
server/uploads  uploaded images (git-ignored, served at /uploads)
```

---

## Quick start (local)

**Prerequisites:** Node.js 20+ (tested on 24), npm 10+, and Docker (or any MongoDB 6+ on `localhost:27017`).

```bash
# 1. Database
docker compose up -d

# 2. API
cd server
cp .env.example .env        # then fill in the secrets (see below)
npm install
npm run seed                # admin user, default content, 15 sample enquiries
npm run dev                 # http://localhost:4000/api  ·  Swagger at /api/docs

# 3. Website + admin (in a second terminal)
cd client
cp .env.example .env
npm install
npm run dev                 # http://localhost:5173  ·  admin at /admin
```

The minimum you must set in `server/.env`:

```bash
# two different random secrets
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
JWT_ACCESS_SECRET=…
JWT_REFRESH_SECRET=…
ADMIN_EMAIL=you@example.com
ADMIN_PASSWORD=choose-a-strong-one
```

Emails are optional for local development. Without `SMTP_PASS`, enquiries still save, and each one is marked `emailStatus: failed` with the reason. You can resend from the admin panel once SMTP is configured.

In development Vite proxies `/api` and `/uploads` to `localhost:4000`, so the site and the API share an origin and no CORS setup is needed.

---

## Gmail App Password (for sending email)

Gmail won't accept your normal password over SMTP. Create an **App Password**:

1. Sign in to the Google account that sends mail (e.g. `throughmytrails@gmail.com`).
2. Turn on **2-Step Verification**: <https://myaccount.google.com/security>.
3. Open <https://myaccount.google.com/apppasswords>, name it "Through My Trails website", and click **Create**.
4. Copy the 16-character password into `SMTP_PASS` (spaces don't matter).
5. Restart the API, then go to **Admin → Settings → Send test email**.

Gmail allows about 500 recipients a day. For higher volume, switch the `SMTP_*` values to a transactional provider (Brevo, Postmark, SES). No code changes are needed.

---

## Environment variables

### `server/.env`

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `PORT` | | `4000` | API port |
| `NODE_ENV` | | `development` | `production` enables secure, cross-site refresh cookies |
| `MONGODB_URI` | ✔ | | MongoDB connection string |
| `JWT_ACCESS_SECRET` | ✔ | | Signs 15-minute access tokens |
| `JWT_REFRESH_SECRET` | ✔ | | Signs 7-day refresh tokens (must differ from the access secret) |
| `CLIENT_URL` | | `http://localhost:5173` | CORS allow-list (comma-separated). The first entry is used for admin links in emails |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | ✔ for first run | | Admin account created on first start if it doesn't exist |
| `ADMIN_NAME` | | `Admin` | Shown in the admin panel and as the author of notes |
| `ADMIN_NOTIFY_EMAIL` | | `throughmytrails@gmail.com` | Receives new-enquiry alerts |
| `SMTP_HOST` / `SMTP_PORT` | | `smtp.gmail.com` / `465` | SMTP server (port 465 = TLS) |
| `SMTP_USER` / `SMTP_PASS` | for email | | SMTP login (Gmail App Password) |
| `MAIL_FROM` | | `Through My Trails <throughmytrails@gmail.com>` | From header |
| `UPLOAD_DIR` | | `uploads` | Where images are stored (relative to `server/` or absolute) |
| `MAX_UPLOAD_MB` | | `5` | Per-file limit |
| `TRUST_PROXY` | | | Set to `1` behind Render/Railway/Nginx so rate limits see the real client IP |

### `client/.env`

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | API origin in production, e.g. `https://api.throughmytrails.com`. Leave empty in development. |
| `VITE_SITE_URL` | Public site URL, used for canonical and Open Graph tags. |

---

## Scripts

| Where | Command | Does |
|---|---|---|
| server | `npm run dev` | API with watch mode |
| server | `npm start` | Compile and run once (no watch) |
| server | `npm run build && npm run start:prod` | Production build, then run the compiled `dist/` |
| server | `npm run seed` | Idempotent seed; `npm run seed -- --force` adds 15 more samples |
| server | `npm run mail:preview` | Renders every email to `server/mail-preview/*.html` |
| server | `npm run test:e2e` | Supertest e2e tests (uses the `throughmytrails_test` database, which it wipes) |
| client | `npm run dev` / `npm run build` / `npm run preview` | Vite |

## Editing the emails

Templates live in `server/src/mail/templates/`:

- `enquiry-confirmation.hbs` / `.txt.hbs`: sent to the traveller
- `admin-new-enquiry.hbs` / `.txt.hbs`: sent to `ADMIN_NOTIFY_EMAIL`
- `test-email.hbs` / `.txt.hbs`: the Settings test
- `partials/layout.hbs` (header band, footer), `partials/button.hbs`, `partials/summary-row.hbs`

They use tables and inline CSS for Gmail, Outlook and Apple Mail. The logo is embedded as a CID attachment, so it shows without "load images". Handlebars escapes every `{{value}}`, and user input is also stripped of markup on the way in. After editing, run `npm run mail:preview` and open the HTML files.

## API

Prefix `/api`. Full interactive docs at **`/api/docs`** (Swagger).

```
POST   /enquiries                     public · 5 per IP per 10 min · honeypot
GET    /public/site-content           public
POST   /auth/login | /auth/refresh | /auth/logout
GET    /admin/stats
GET    /admin/enquiries               ?page&limit&q&status&tripType&from&to&sort
GET    /admin/enquiries/export.csv    same filters, no pagination
PATCH  /admin/enquiries/bulk-status
GET    /admin/enquiries/:id
PATCH  /admin/enquiries/:id
POST   /admin/enquiries/:id/notes
POST   /admin/enquiries/:id/resend-email
DELETE /admin/enquiries/:id           soft delete
POST   /admin/media                   multipart "files" (≤20), optional "alts" JSON array
GET    /admin/media
PATCH  /admin/media/:id               { alt }
DELETE /admin/media/:id?force=true    409 if in use unless force
GET    /admin/site-content
PUT    /admin/site-content            { slots?, tripTypes?, services?, contact? }
GET    /admin/settings/mail
POST   /admin/settings/test-email     { to? }
GET    /admin/me
PATCH  /admin/me/password
```

Every error has the same shape: `{ statusCode, error, message, details?, path, timestamp }`.

---

## Deploying

A simple, low-cost setup:

| Piece | Service |
|---|---|
| Database | **MongoDB Atlas** (free M0 is fine to start). Allow your API host's IPs, or `0.0.0.0/0` with a strong password. |
| API | **Render** (Web Service) or **Railway** |
| Website | **Vercel** or **Netlify** |

### API on Render
- Root directory `server`. Build: `npm ci && npm run build`. Start: `npm run start:prod`.
- Environment: everything in the table above, plus `NODE_ENV=production`, `TRUST_PROXY=1`, and `CLIENT_URL=https://www.your-domain.com`.
- **Uploads need persistent storage.** Render and Railway filesystems are wiped on every deploy. Attach a **persistent disk** (Render: *Disks*, mounted at e.g. `/var/data`) and set `UPLOAD_DIR=/var/data/uploads`. On Railway, add a Volume. For multiple instances, move uploads to S3/Cloudinary/R2 (the only code to change is `media.module.ts` storage and `media.service.ts` delete).
- Run the seed once from the service shell: `npm run seed` (after `npm run build`, `node dist/seed.js` also works).

### Website on Vercel or Netlify
- Root directory `client`. Build: `npm run build`. Output: `dist`.
- Set `VITE_API_URL` to the API origin and `VITE_SITE_URL` to the site URL.
- SPA routing is already configured (`client/vercel.json`, `client/public/_redirects`).

### Cookies and domains
The admin refresh token is an httpOnly cookie. In production it is sent `SameSite=None; Secure`, so the site and API must both use HTTPS. For the most reliable sign-in (Safari blocks many third-party cookies), serve both from **the same registrable domain**, e.g. `www.throughmytrails.com` and `api.throughmytrails.com`, rather than `*.vercel.app` + `*.onrender.com`.

---

## Security notes

- Passwords are hashed with bcrypt (cost 12). Refresh tokens are rotated on every use and stored as SHA-256 digests. Reuse of a rotated token revokes every session. Changing the password signs out all devices.
- Helmet, a CORS allow-list, a global rate limit (120/min/IP), plus 5 enquiries per 10 min and 10 logins per 15 min per IP.
- All input is validated server-side (class-validator, whitelisting, unknown fields rejected) and client-side (Zod). Text is stripped of HTML and control characters before storage. Handlebars escapes everything in emails.
- Uploads: extension and MIME allow-list, 5 MB limit, **magic-byte verification** (a renamed `.exe` is rejected), random filenames, `nosniff` headers.
- CSV exports neutralise spreadsheet formula injection.
- Secrets come only from environment variables. `.env` files are git-ignored.

## Design notes

- Colours, fonts, shapes and every scroll effect come from the original `index-lite.html`. Scroll effects share one `requestAnimationFrame` loop (`client/src/hooks/scrollLoop.ts`).
- `prefers-reduced-motion` turns off all animation. The pinned trip carousel becomes a normal horizontal scroller, so no card is ever unreachable.
- Text contrast: body and label colours are ≥ 6:1 on the beige backgrounds. The gold `#8A6440` is used only for large display type (≥ 3:1 for large text).
- Status colours (New amber, Contacted blue, Itinerary sent terracotta, Booked green, Closed/Lost plum) were validated as a categorical set for colour-vision-deficiency separation. Status is always shown with its text label too.

## Assumptions

1. **bcryptjs** (pure-JS bcrypt, same algorithm and hash format) is used instead of the native `bcrypt` package, to avoid native build steps on hosts.
2. The hero image slot shows as a round photo inside the rotating ring. The `logo` slot replaces the full logo in the hero (when no hero photo is set) and the footer. The navbar and admin sidebar keep the supplied emblem.
3. A trip card's image is its `trip:<key>` slot, so there is one source of truth whether it's set from **Image slots** or **Trip cards**. A trip card's key can't be changed after creation, so past enquiries stay linked. Removing a trip type keeps its enquiries (their trip type is shown by key).
4. The hero and navbar CTAs still open WhatsApp, as in the original. The contact form is the new primary enquiry path, with "or chat on WhatsApp" pre-filled from whatever has been typed.
5. Reference numbers restart each calendar year (India time): `TMT-2026-0001`, … `TMT-2027-0001`.
6. Honeypot submissions get a normal-looking success response but are not stored or emailed.
7. Only one admin role exists. Additional admins can be added by inserting into `admin_users` (the seed shows how).
8. The admin panel is beige-only (no dark theme), matching the brand.
