# HackPulse — MERN full-stack project

This package combines the latest frontend source supplied from the AppDeploy build manifest with the HackPulse MERN backend v2.

## Project layout

- `frontend/` — React 19 + TypeScript + Vite
- `backend/` — Node.js + Express 5 + MongoDB/Mongoose + JWT + Socket.io

## Requirements

- Node.js 20 or later
- npm
- MongoDB Atlas (free cluster is fine for development) or local MongoDB

## 1. Configure the backend

Open a terminal in the project root:

```powershell
Copy-Item backend/.env.example backend/.env
```

Edit `backend/.env` and set `MONGODB_URI`, a random `JWT_SECRET` of at least 32 characters, and a unique `MANAGER_PASSWORD` of at least 12 characters. `MANAGER_EMAIL` defaults to `admin@example.com`. Keep `CLIENT_ORIGINS=http://localhost:5173` for local development.

Do not share or commit `backend/.env`.

## 2. Install dependencies

From the project root:

```powershell
npm install
```

## 3. Create the initial manager and demo data

```powershell
npm run seed
```

The seed script creates a manager account, a demo event, demo students, three judge accounts, teams, a ticket and an announcement. Demo student accounts use password `StudentDemo123!`; the judge accounts (`judge1@example.com`, `judge2@example.com`, `judge3@example.com`) use `JudgeDemo123!`. Change or remove all demo accounts before any public deployment.

## 4. Start the full application locally

```powershell
npm run dev
```

This starts Express at `http://localhost:5000` and React at `http://localhost:5173`. Open `http://localhost:5173` in your browser. The local frontend is configured to call the Express API on port 5000.

You can also start the services separately with `npm run dev:api` and `npm run dev:web` in separate terminals.

## 5. Production-style local run (Express serves React)

```powershell
npm run build
npm start
```

Open `http://localhost:5000`. Express serves the built React application and API from the same origin.

## Useful commands

```powershell
npm run test
npm run seed
npm run build
```

API health check: `http://localhost:5000/api/health`

For Render, the root `render.yaml` builds the frontend and starts the backend from the project root. Set `MONGODB_URI` and `CLIENT_ORIGINS` in the Render dashboard.

## Roles

Manager, Student, Judge, Mentor and Volunteer. Public registration creates student accounts. The manager provisions staff accounts through the manager-only user endpoint.

## Integration notes and known limitations

This is an integrated development package, not a claim of production readiness.

- The existing manager workspace still contains sample/demo state and some workflows fall back to demo behavior when API calls fail. Verify every workflow against the database before relying on it.
- The manager certificate ZIP action in the current React workspace still generates demo HTML/CSV certificates. The backend has certificate issue/export/verification endpoints, but the manager UI has not been fully switched to them.
- Student judge/results, judge score, and profile screens are partly placeholder views and need further UI wiring.
- Matchmaker UI is currently local/demo; the backend has matchmaker endpoints.
- Schedule integration accepts the existing frontend schedule shape and attempts to map team/judge names to database records. It can only persist slots when those names match actual records.
- The backend includes Socket.io authorization, but realtime UI behavior should be tested with multiple logged-in roles.
- Email verification and password reset are not implemented.
- The matchmaker is rule-based, not an AI model.
- Certificate exports are HTML certificates plus a CSV register; print HTML to PDF if individual PDFs are needed.
- Run automated tests and perform end-to-end tests with a disposable MongoDB database before any public use.

## Security

Never use example/demo credentials in a public deployment. Keep real credentials only in `backend/.env`, never in example files; rotate any credentials that were previously shared or committed. Use a strong unique JWT secret, restrict CORS origins, use HTTPS, protect MongoDB credentials and configure backups.
