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
| `MAIL_TRANSPORT` | | `smtp` | `smtp` (Nodemailer) or `brevo` (HTTPS API, for hosts that block SMTP) |
| `BREVO_API_KEY` | with `brevo` | | Brevo API key; the `MAIL_FROM` address must be a verified Brevo sender |
| `SITE_URL` | | first `CLIENT_URL` | Public site URL for email links and the email logo |
| `UPLOAD_STORAGE` | | `disk` | `disk` (UPLOAD_DIR) or `mongo` (GridFS, for hosts without a persistent disk) |
| `UPLOAD_DIR` | | `uploads` | Where images are stored in `disk` mode (relative to `server/` or absolute) |
| `MAX_UPLOAD_MB` | | `5` | Per-file limit |
| `TRUST_PROXY` | | `0` | Proxy hops to trust for the client IP: `1` behind a single proxy, `true` behind Vercel's proxy |
| `COOKIE_SAMESITE` | | `lax` | `lax` when the site proxies `/api`; `none` if the site calls the API cross-site (HTTPS only) |

### `client/.env`

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Leave empty when the site proxies `/api` (development, and the Vercel setup). Set it only if the site calls the API on another domain. |
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

## Deploying (free)

| Piece | Free service | Notes |
|---|---|---|
| Database | **MongoDB Atlas** M0 | 512 MB. Also stores uploaded images (GridFS). |
| API | **Render** free web service | `render.yaml` Blueprint. Sleeps after 15 idle minutes; no disk; SMTP blocked. |
| Email | **Brevo** free | 300 emails/day over HTTPS (Render's free plan blocks SMTP ports). |
| Website | **Vercel** Hobby | Proxies `/api` and `/uploads` to Render, so everything is one origin. |
| Keep-awake | **cron-job.org** or **UptimeRobot** | Pings `/api/health` every 10 minutes so the API doesn't sleep. |

Render's free plan [blocks outbound SMTP](https://render.com/changelog/free-web-services-will-no-longer-allow-outbound-traffic-to-smtp-ports) and has an [ephemeral filesystem with no disk or shell](https://render.com/docs/free). The app handles both with `MAIL_TRANSPORT=brevo` and `UPLOAD_STORAGE=mongo`, which the Blueprint sets for you. The admin user and default site content are created automatically on first boot, so no shell or seed step is needed.

### 1. MongoDB Atlas
1. Sign up at <https://www.mongodb.com/cloud/atlas/register>. Create a **free M0** cluster (region: Mumbai `ap-south-1` or Singapore).
2. **Database Access** → add a user with a generated password (built-in role *Read and write to any database*).
3. **Network Access** → *Add IP Address* → `0.0.0.0/0`. Render's free plan has no fixed outbound IP.
4. **Connect → Drivers**, copy the URI, insert the password and a database name:
   `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/throughmytrails?retryWrites=true&w=majority`

### 2. Brevo (email)
1. Sign up at <https://www.brevo.com> (free plan).
2. **Senders, domains & dedicated IPs → Senders → Add a sender** with the address emails come from (e.g. your Gmail), and confirm the verification email.
3. **SMTP & API → API keys → Generate a new API key**. Copy it; it's only shown once.

### 3. API on Render
1. Sign up at <https://render.com> with GitHub and give it access to this repository.
2. **New → Blueprint** → select the repo. Render reads `render.yaml` and asks for the secret values:
   - `MONGODB_URI`: from step 1
   - `CLIENT_URL`: your Vercel URL from step 4 (enter a placeholder now and correct it afterwards)
   - `ADMIN_EMAIL`, `ADMIN_PASSWORD`: your admin login (password ≥ 8 characters)
   - `ADMIN_NOTIFY_EMAIL`: where new-enquiry alerts go
   - `BREVO_API_KEY`: from step 2
   - `MAIL_FROM`: `Through My Trails <the-sender-you-verified@gmail.com>`
3. Deploy. When it's live, open `https://<your-service>.onrender.com/api/health`; it should say `"status":"ok"`.
4. If Render gave the service a different URL than `throughmytrails-api.onrender.com`, update the two API URLs in `client/vercel.json` (and `client/public/_redirects` if you use Netlify), then commit.

### 4. Website on Vercel
1. Sign up at <https://vercel.com> with GitHub → **Add New → Project** → import this repo.
2. **Root Directory:** `client`. Framework: *Vite* (detected). Build and output settings stay at their defaults.
3. Environment variable: `VITE_SITE_URL` = the site URL, e.g. `https://throughmytrails.vercel.app`. Leave `VITE_API_URL` **unset**, because the site calls `/api` on its own domain and Vercel forwards it to Render.
4. Deploy. Then in Render set `CLIENT_URL` to this exact URL (no trailing slash) and let it redeploy. Email links and the email logo use it.

### 5. Keep the API awake
On <https://cron-job.org> (or UptimeRobot), create a job that GETs `https://<your-service>.onrender.com/api/health` **every 10 minutes**. One always-on service fits inside Render's 750 free hours a month. Without it, the first visit after 15 idle minutes waits about a minute for the API to wake, and that first enquiry can time out.

### After deploying
- Sign in at `https://<site>/admin`, go to **Settings → Send test email**, and change the admin password.
- Upload images under **Media & content**. They're stored in Atlas and survive restarts and redeploys.
- Every `git push` to `main` redeploys both services.

### Other hosts
Running on a host with a persistent disk and open SMTP (a paid Render instance, a VPS, Railway with a volume)? Set `UPLOAD_STORAGE=disk` with `UPLOAD_DIR` on that disk, and `MAIL_TRANSPORT=smtp` with the Gmail App Password. If the website calls the API on a different domain instead of proxying, set the client's `VITE_API_URL` and the server's `COOKIE_SAMESITE=none` (HTTPS required). Serve both from one registrable domain (e.g. `www.` and `api.`) so Safari keeps the sign-in cookie.

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
