# TeleTriage — Backend

Backend for the **Telemedicine Triage & Queue System** (CSE 3200, Design
Project-II, Group 09, ULAB). Built to match the SRS in
`Group_9_Telemedicine_Triage_Requirement_Report.pdf` and the frontend
prototype in `TeleTriage/`.

This backend has been run and manually tested end-to-end during
development (registration, login, symptom submission → triage scoring,
the full doctor queue workflow, and socket broadcasts all verified
working against a real PostgreSQL database).

## Architecture

```
                        ┌─────────────────────┐
  Browser (frontend) ──►│   Node.js / Express  │──► PostgreSQL
  + Socket.IO client    │   (this backend)     │
                        └──────────┬───────────┘
                                   │ HTTP (axios)
                                   ▼
                        ┌─────────────────────┐
                        │  Python triage       │
                        │  microservice        │
                        │  (Flask, /score)     │
                        └─────────────────────┘

  bKash Sandbox API ◄── payment create/execute/status ── Node.js
        │
        └── webhook callback ──► POST /api/payments/bkash/callback
```

- **Node.js/Express** owns all REST endpoints, auth, the database, and
  Socket.IO broadcasts.
- **Python/Flask** is a small, separate microservice that only does one
  thing: score symptoms into a severity (1–5) + specialty. Node calls it
  over HTTP for every submission — the score a patient sees in their
  browser is never trusted, only what this service returns.
- **PostgreSQL** is the single source of truth (patients, doctors,
  submissions, triage results, payments, queue, archive).
- **bKash Sandbox** confirms payment two ways: a webhook callback (durable,
  server-to-server) and a polling endpoint (fallback if the webhook is
  slow or dropped).

## Folder structure

```
backend/
├── db/
│   └── schema.sql              All tables, indexes, constraints
├── src/
│   ├── server.js                Entry point — wires Express + Socket.IO
│   ├── config/db.js              PostgreSQL connection pool
│   ├── db/seed.js                Creates schema + admin + demo doctors
│   ├── middleware/
│   │   ├── auth.js                JWT verification + role guard
│   │   └── errorHandler.js        Central error → JSON response
│   ├── routes/                   One file per resource, thin — just wiring
│   ├── controllers/               Route handlers — the actual logic
│   ├── services/
│   │   ├── triageService.js       HTTP client for the Python microservice
│   │   ├── bkashService.js        bKash Sandbox API client
│   │   └── queueService.js        Priority ordering + wait-time math
│   ├── sockets/socketHandlers.js  Socket.IO rooms + broadcast helpers
│   └── utils/                    jwt.js, asyncHandler.js
├── triage-engine/                 Python microservice (separate process)
│   ├── app.py
│   ├── rules.py
│   └── requirements.txt
├── package.json
└── .env.example
```

## Prerequisites

- Node.js 18+ (tested on Node 22)
- Python 3.10+
- PostgreSQL 14+ (tested on 16)

## Setup — from a clean machine

```bash
# 1) Install PostgreSQL if you don't have it, then create a database
sudo apt-get install postgresql
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"
sudo -u postgres psql -c "CREATE DATABASE teletriage;"

# 2) Node backend
cd backend
cp .env.example .env          # then edit .env — see "Environment variables" below
npm install
npm run seed                  # creates tables + an admin + 6 demo doctors
npm run dev                   # starts on http://localhost:5000 (or `npm start`)

# 3) Python triage microservice (separate terminal)
cd backend/triage-engine
pip install -r requirements.txt
python app.py                 # starts on http://localhost:6000
```

Check both are up:
```bash
curl http://localhost:5000/health
curl http://localhost:6000/health
```

Seeded logins (all use password `Password1!`):
| Role   | Identifier              |
|--------|--------------------------|
| Admin  | username: `admin`        |
| Doctor | doctorCode: `DOC-001` (Cardiology), `DOC-002` (Neurology), `DOC-003` (Emergency Medicine), `DOC-004` (General Medicine), `DOC-005` (Rheumatology), `DOC-006` (Dermatology) |
| Patient| register your own via `POST /api/auth/register` |

## Environment variables

See `.env.example` for the full list. The two you must fill in for real
payments to work are the bKash sandbox credentials — get these by
registering as a merchant at the
[bKash Developer Portal](https://developer.bka.sh/) and creating a
**Tokenized Checkout** sandbox app:

```
BKASH_APP_KEY=...
BKASH_APP_SECRET=...
BKASH_USERNAME=...
BKASH_PASSWORD=...
```

Without real credentials, every `/api/payments/*` call that reaches bKash
will fail cleanly with `502 Payment gateway unavailable` rather than
crashing — the rest of the API works fine without them.

## Wiring this up to the frontend

Two frontend packages have been provided so far; this section covers the
current 14-page one (`patient-login.html`, `doctor-login.html`,
`payment.html`, `priority-queue.html`, `case-history.html`, etc.). It's
HTML-only — no `css/`, `js/`, or `img/` folder was included, so none of
it renders or runs as-is yet, and there's no client-side script to see
the exact intended request shapes. The table below is what to wire in
once those JS files exist:

| Page | What to change |
|---|---|
| `register.html` | `POST /api/auth/register` with `fullName`, `email`, `phone`, `password`; store the returned `token`. |
| `patient-login.html` | `POST /api/auth/login/patient` with `{ email, password }`. |
| `doctor-login.html` | `POST /api/auth/login/doctor` with `{ doctorId, password }`. |
| `symptom-form.html` | `POST /api/patients/symptoms`; store the returned `submissionId` and `triage` object (e.g. in `sessionStorage`), then route to `triage-result.html`. |
| `triage-result.html` | Read the stored triage result to fill in the severity/specialty fields. The "Join Priority Queue" button should call `POST /api/payments/initiate` with the stored `submissionId` and redirect to the returned payment URL. |
| `payment.html` / `payment-success.html` | After the gateway redirects back, call `POST /api/payments/execute`; on success it returns `queueId` — that's the moment the case enters the queue (FR-39). |
| `patient-dashboard.html` | `GET /api/patients/me/status` on load; connect Socket.IO (`join-patient-room`, listen for `status-updated`/`payment-confirmed`) instead of polling. |
| `case-history.html` (patient side, i.e. `GET /me/history`) / `priority-queue.html`, `case-history.html` (doctor side) | `GET /api/doctors/queue`, `GET /api/doctors/case-history`; connect Socket.IO (`join-doctor-queue`, listen for `queue-updated`). |
| `doctor-dashboard.html` | `GET /api/doctors/me/stats` for the summary cards, `GET /api/doctors/queue` for "Today's Priority Queue". The "Today's Scheduled Appointments" panel has no backend yet — see **Known gaps** below. |
| `appointment-picker.html`, `doctor-schedule.html` | No backend yet — see **Known gaps** below. |

Store the JWT in memory or `sessionStorage` and send it as
`Authorization: Bearer <token>` on every API call.

## Known gaps — needs a decision before more code is written

- **Payment gateway mismatch.** The SRS (FR-35/36) specifies bKash
  directly; this backend implements that (`services/bkashService.js`,
  bKash Tokenized Checkout sandbox). The newer `payment.html` is branded
  **SSLCommerz** instead, with bKash as one of several methods inside it
  (Nagad, Rocket, cards, net banking). These are different APIs with
  different sandbox signup processes. Nothing was changed here yet —
  say which one you want and the swap is contained to a new
  `sslcommerzService.js` plus one import change in `paymentController.js`,
  since the controller/DB logic (create payment record → redirect →
  webhook or poll → create queue entry) stays the same either way.
- **Fixed Appointment Slots.** `appointment-picker.html` and
  `doctor-schedule.html`, plus the "Today's Scheduled Appointments" panel
  on `doctor-dashboard.html`, describe a second intake path (book a fixed
  time slot with a specific doctor) running alongside the priority queue.
  This isn't in the SRS's functional requirements at all, and it's a real
  chunk of new work (doctor weekly availability, slot generation, booking
  with conflict checks, a triage-outcome branch deciding queue vs. slot).
  Not built yet — say whether you want it built, skipped, or stubbed
  with a minimal version just for the demo.
- **Broken internal links.** Several pages link to `login.html`
  (`index.html`'s two login buttons, sidebar "Logout" links across the
  dashboards), but only `patient-login.html`/`doctor-login.html` exist —
  this is a frontend-only fix (repoint the links, or add a small
  `login.html` that redirects based on a `?role=` query param).
- **`profile.html`** is linked from every sidebar but wasn't included in
  either frontend package. `GET /api/patients/me` and `GET /api/doctors/me`
  are ready for it whenever it's built.
- **Doctor-visible patient identity.** The backend anonymizes patients to
  a `patientDisplayId` (e.g. `P-0001`) per the SRS's FR-22, but
  `case-history.html`'s mockup rows show real patient names. Kept
  anonymized for now since that matches the written requirement — flag it
  if you actually want real names shown to doctors, it's a one-line
  change.

## API Reference

All request/response bodies are JSON. Protected routes require
`Authorization: Bearer <token>`.

### Auth — `/api/auth`

| Method & Path | Auth | Body | Returns |
|---|---|---|---|
| `POST /register` | — | `{ fullName, email, phone, password, dateOfBirth?, district? }` | `201 { token, user }`. `dateOfBirth`/`district` are optional (the newer `register.html` doesn't collect them; the SRS's FR-01 does, so both are accepted). |
| `POST /login/patient` | — | `{ email, password }` **or** `{ phone, password }` | `{ token, user }`. The newer `patient-login.html` sends `email` only; phone-based login (SRS FR-02) still works too — send whichever you have. |
| `POST /login/doctor` | — | `{ doctorId, password }` **or** `{ doctorCode, password }` | `{ token, user }`. Both key names work — `doctor-login.html` uses `doctorId`. |
| `POST /login/admin` | — | `{ username, password }` | `{ token, user }` |
| `POST /logout` | — | — | `{ message }` |

### Patients — `/api/patients` (patient JWT required)

| Method & Path | Body | Returns |
|---|---|---|
| `GET /me` | — | The logged-in patient's own profile — for `profile.html` (referenced in every sidebar but not included in the frontend files yet) |
| `POST /symptoms` | `{ chiefComplaint, duration, painLevel, bodyLocation?, notes? }` | `201 { submissionId, submittedAt, triage: { triageId, severityScore, urgencyLabel, specialty }, nextStep: "payment" }`. `duration` can be free text (e.g. `"1 week or more"`) — the triage engine matches on keywords, not an exact enum. Returns `409` with `existingSubmissionId` if the patient already has an unresolved case (FR-09). |
| `GET /triage/:submissionId` | — | Full triage + submission detail |
| `GET /me/status` | — | `{ hasActiveCase, status, queuePosition, estimatedWaitMins, severityScore, urgencyLabel, specialty, paymentStatus, doctorReady, assignedDoctor }`. `status` is `"Awaiting Payment"` before payment, then `Queued → Under Review → Consulting → Completed`. `assignedDoctor` is `{ name, specialty }` once a doctor has opened the case, otherwise `null` — feeds `patient-dashboard.html`'s "Assigned Medical Specialist" card. |
| `GET /me/history` | — | Array of the patient's archived (completed) past cases |

### Doctors — `/api/doctors` (doctor JWT required)

Every route here is automatically scoped to the logged-in doctor's own
`specialty` (read from their JWT) — a doctor can never see another
specialty's queue (FR requirement: dashboard returns only matching
patients).

| Method & Path | Body / Query | Returns |
|---|---|---|
| `GET /me` | — | The logged-in doctor's own profile (name, specialty, doctor code) |
| `GET /queue` | `?severity=1..5` optional | `{ specialty, count, queue: [ { queueId, position, patientDisplayId, severityScore, urgencyLabel, specialty, chiefComplaint, painLevel, paymentStatus, estimatedWaitMins, assignedDoctor, ... } ] }`, ordered by severity then submission time |
| `GET /queue/:queueId` | — | Full case detail + `pastCases` (patient's archived history) |
| `PATCH /queue/:queueId/status` | `{ status: "Under Review"\|"Consulting"\|"Completed", notes?, diagnosis?, outcome? }` | `{ queueId, status, message }`. Sets the doctor as the case's `assignedDoctor` on every call. `Completed` archives the case (with `diagnosis`/`outcome` if given) and removes it from the active queue. |
| `GET /me/stats` | — | `{ criticalCount, urgentCount, moderateOrLowCount, consultingCount, activeCount, completedToday }` — matches `priority-queue.html`'s and `doctor-dashboard.html`'s summary cards |
| `GET /case-history` | `?outcome=`, `?date=YYYY-MM-DD`, `?search=` optional | `{ specialty, count, summary: { completedCases, followupsPending, referrals }, cases: [...] }` — powers `case-history.html`. `search` matches diagnosis text or a patient ID number. |

### Payments — `/api/payments`

| Method & Path | Auth | Body | Returns |
|---|---|---|---|
| `POST /initiate` | patient | `{ submissionId }` | `{ paymentID, bkashURL, amount }` — redirect the browser to `bkashURL`. `409` if already paid (FR-42). |
| `POST /execute` | patient | `{ paymentID, cancelled? }` | On success: `{ status: "Success", transactionId, amount, paidAt, queueId }` — this is the moment the queue entry is created (FR-39). On failure/cancel: `{ status: "Failed"\|"Cancelled", message }` (FR-38, retry allowed). |
| `GET /:paymentID/status` | patient | — | `{ status, transactionId? }` — fallback polling if the webhook/execute step didn't resolve things |
| `POST /bkash/callback` | none (bKash calls this directly) | bKash's webhook payload | `{ received: true }` |

### Admin — `/api/admin` (admin JWT required)

| Method & Path | Body | Returns |
|---|---|---|
| `GET /patients` | — | All registered patients |
| `GET /doctors` | — | All registered doctors |
| `POST /doctors` | `{ doctorCode, fullName, specialty, password }` | `201`, newly created doctor (doctors are pre-registered by admin, not self-registered) |
| `PATCH /patients/:id/deactivate` | — | `{ message }` |
| `PATCH /doctors/:id/deactivate` | — | `{ message }` |

### Socket.IO events

| Direction | Event | Payload |
|---|---|---|
| Client → Server | `join-doctor-queue` | specialty string, e.g. `"Cardiology"` |
| Client → Server | `join-patient-room` | patientId |
| Server → Client | `queue-updated` | Full ordered queue array for that specialty — sent whenever a case is added, its status changes, or it's completed |
| Server → Client | `payment-confirmed` | `{ queueId }` — sent to the paying patient's room |
| Server → Client | `status-updated` | `{ queueId, status }` — sent to the patient whose case changed |

### Triage microservice (internal — called by Node, not the frontend)

| Method & Path | Body | Returns |
|---|---|---|
| `POST /score` | `{ complaint, duration, pain, body_location? }` | `{ severity_score, urgency_label, specialty }` |

## Design notes / assumptions

- **Queue position is computed on read, not stored.** `queue_entries`
  doesn't have a `position` column — position and estimated wait time
  are derived fresh from `ORDER BY severity_score, created_at` every
  time the queue is fetched. At this project's scale that's simpler and
  avoids race conditions from maintaining a position counter.
- **FR-09 ("one active case at a time")** is enforced against
  `symptom_submissions`, not just paid queue entries — a patient who has
  submitted symptoms but not yet paid still counts as having an active
  case, and the 409 response includes their `existingSubmissionId` so
  the frontend can route them straight back to the payment step instead
  of a dead end.
- **Passwords** are hashed with bcrypt (10 rounds); the frontend's
  `js/auth.js` password-strength meter and phone-format checks are
  UX-only and are re-validated server-side (register requires 8+ chars;
  add the full complexity regex from `auth.js` here too if your SRS
  grading wants a strict match).
- **Rate limiting** is applied to `/api/auth/login*` (20 requests / 15
  min) as a baseline brute-force guard; tighten with `express-rate-limit`
  options if needed.
- **Doctor accounts are admin-created only** (`POST /api/admin/doctors`),
  matching the SRS assumption that doctors do not self-register.
- **Patients can log in with either email or phone.** The newer
  `patient-login.html` only collects email, which conflicts with the
  SRS's FR-02 (phone-based login). Rather than pick one, `/login/patient`
  accepts whichever identifier is sent, so both frontend versions work
  against the same endpoint.
- **`assigned_doctor_id`** on `queue_entries` is set the first time any
  doctor of the matching specialty touches a case (any status change, not
  just completion) — it answers "which doctor is handling this" for the
  patient dashboard. Since any doctor in a specialty can act on any case
  in that specialty's queue, this is "whoever picked it up," not a
  pre-assignment.
