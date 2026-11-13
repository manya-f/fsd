# HackPulse MERN Backend — v2

A clean Node.js + Express + MongoDB/Mongoose API for the HackPulse React portals. Includes JWT authentication, role-based access control, event/team operations, registrations, judging, score release, mentor tickets, check-in/coupons, certificates, project gallery, analytics, audit logs and Socket.io updates.

## 1. Requirements
- Node.js 20+
- MongoDB Atlas or local MongoDB
- npm

## 2. Install and configure
```powershell
npm install
Copy-Item .env.example .env
```
Edit `.env`. Set a long random `JWT_SECRET`, `MONGODB_URI`, and `CLIENT_ORIGINS`. Never commit `.env`.

## 3. Run locally
```powershell
npm run seed
npm run dev
```
API health: `http://localhost:5000/api/health`

## 4. Seeded accounts

The manager account is configured through `MANAGER_EMAIL` and `MANAGER_PASSWORD` in `.env`.

All seeded student accounts use the password: `StudentDemo123!`

| Event | Student demo accounts |
| --- | --- |
| HackPulse Buildathon | `aarav@example.com`, `ananya@example.com`, `ishaan@example.com`, `diya@example.com`, `rohan@example.com`, `meera.student@example.com`, `kabir@example.com`, `sana@example.com`, `nikhil.bhat@example.com`, `priya.iyer@example.com`, `varun.shetty@example.com`, `aisha.khan@example.com` |
| AI for Good Sprint | `aditya.rao.ai@example.com`, `bhavana.s.ai@example.com`, `chirag.jain.ai@example.com`, `divya.menon.ai@example.com`, `eshan.kapoor.ai@example.com`, `farah.ali.ai@example.com`, `gautam.das.ai@example.com`, `harini.r.ai@example.com`, `imran.sheikh.ai@example.com`, `jhanvi.patel.ai@example.com`, `karan.malhotra.ai@example.com`, `lavanya.reddy.ai@example.com`, `manav.gupta.ai@example.com`, `neha.kulkarni.ai@example.com`, `om.prakash.ai@example.com`, `pallavi.n.ai@example.com` |
| Dec Hackathon | `riya.verma.dec@example.com`, `siddharth.rao.dec@example.com`, `tanvi.joshi.dec@example.com`, `uday.kumar.dec@example.com`, `veda.nair.dec@example.com`, `yash.mehta.dec@example.com`, `zoya.khan.dec@example.com`, `arnav.das.dec@example.com` |

All seeded judge accounts use the password: `JudgeDemo123!`

| Event | Judge demo accounts |
| --- | --- |
| HackPulse Buildathon | `judge1@example.com` (Dr. Meera Rao), `judge2@example.com` (Arjun Nair), `judge3@example.com` (Kavya Menon) |
| AI for Good Sprint | `judge4@example.com` (Dr. Ritu Shah), `judge5@example.com` (Vikram Iyer), `judge6@example.com` (Nandita Bose) |
| Dec Hackathon | `judge4@example.com` (Dr. Ritu Shah), `judge5@example.com` (Vikram Iyer) |

Change or delete all demo accounts before any public deployment. The seed is idempotent for the two demo events and their records.

## 5. Roles
- `manager`: full administration.
- `student`: own registration/team, project and personal tickets/certificates.
- `judge`: assigned teams and own scores only.
- `mentor`: open/assigned help tickets.
- `volunteer`: pass/coupon check-in only.

The backend enforces permissions; frontend visibility is not a security boundary.

## 6. Main endpoints

### Authentication
- `POST /api/auth/register` — public student registration only.
- `POST /api/auth/login`
- `GET /api/auth/me`
- `PATCH /api/auth/me`
- `POST /api/auth/users` — manager provisions staff/manager accounts.
- `GET /api/auth/users` — manager list users.
- `PATCH /api/auth/users/:id` — manager updates role/active/name.

### HackPulse (`/api/hackpulse`)
- `GET /state`
- `POST /events`, `PATCH /events/:eventId`, `DELETE /events/:eventId` (archive)
- `POST /register-team`
- `POST /teams/:teamId/join`, `GET /teams`, `PATCH /teams/:teamId`, `POST /teams/:teamId/members`
- `GET /registrations/:eventId`, `PATCH /registrations/:id/status`
- `POST /matchmaker/generate`, `POST /matchmaker/approve`
- `POST /rubrics`, `GET /rubrics/:eventId`
- `POST /assignments`, `GET /assignments`
- `POST /schedule`
- `POST /score`, `GET /scores/:eventId`, `POST /results/release`
- `POST /tickets`, `GET /tickets`, `PATCH /tickets/:id/claim`, `PATCH /tickets/:id/resolve`
- `POST /action` (existing manager UI compatibility for tickets/announcements)
- `POST /announcements`
- `POST /coupons`, `POST /checkin`, `GET /checkins/:eventId`
- `POST /certificates`, `GET /certificates/:eventId`, `GET /certificates/:eventId/export.zip`, `POST /certificates/:certificateId/revoke`, `GET /verify/:certificateId`
- `POST /projects`, `PATCH /projects/:eventId/:teamId/publish`, `GET /projects/:eventId`, `GET /projects/:eventId/mine`
- `GET /analytics/:eventId`, `GET /audit/:eventId`
- `GET /api/private-health` (authenticated)

Send `Authorization: Bearer <token>` for protected routes.

## 7. Socket.io
Authenticated clients connect to the same API origin with `auth: { token }`, then emit `event:join` with an event ID. The server checks role/event membership before joining the room. Server updates are emitted as `event:update`.

## 8. Deployment notes
Deploy the project root as a Node service (for example Render). The root `render.yaml` builds the frontend and starts the API. Set `MONGODB_URI` and `CLIENT_ORIGINS` in the hosting dashboard; do not copy credentials into example files. Run the seed only against a disposable or intentionally configured database.

## 9. Important limitations / production hardening
- Email verification and password-reset delivery require an email provider and are not implemented.
- The matchmaker is transparent rule-based skill balancing, not generative AI.
- Certificate ZIP currently contains HTML certificates and a CSV register; use browser Print > Save as PDF for individual PDFs. PDF rendering can be added with a dedicated renderer.
- QR pass issuance and scanning UI integration still need frontend work; this API validates pre-issued coupon codes and `HP-PASS-` demo pass formats.
- Rate limiting is applied to authentication; add broader per-user limits and monitoring before public scale.
- Add automated integration tests with a disposable MongoDB test database before production.
- Configure backups, database indexes, monitoring, HTTPS and secret rotation.
