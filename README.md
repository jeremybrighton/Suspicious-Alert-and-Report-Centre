# FRC Platform — Financial Intelligence Processing System

Frontend for the **Financial Reporting Centre of Kenya** central intelligence and case-processing platform.

---

## Tech Stack

- **Next.js 16** (App Router)
- **TypeScript**
- **Tailwind CSS v4**
- **lucide-react** (icons)

---

## Prerequisites

- Node.js 18+
- npm 9+

---

## Local Development

### 1. Clone the repository

```bash
git clone https://github.com/jeremybrighton/Suspicious-Alert-and-Report-Centre.git
cd Suspicious-Alert-and-Report-Centre
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy the example file and set the backend URL:

```bash
cp .env.example .env.local
```

`.env.local` contents:

```env
NEXT_PUBLIC_API_URL=https://financial-intelligence-processing-system.onrender.com/api/v1
```

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Test Credentials (seeded in live backend)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@frc.go.ke | FRCAdmin2026! |
| Analyst | analyst@frc.go.ke | FRCAnalyst2026! |
| Investigator | investigator@frc.go.ke | FRCInvest2026! |
| Auditor | auditor@frc.go.ke | FRCAudit2026! |

---

## Build for Production

```bash
npm run build
npm start
```

---

## Deploy to Vercel

### Step 1 — Import repository

1. Go to [https://vercel.com/new](https://vercel.com/new)
2. Import `jeremybrighton/Suspicious-Alert-and-Report-Centre`
3. Framework will be auto-detected as **Next.js**

### Step 2 — Add environment variable

In Vercel project settings → Environment Variables:

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_API_URL` | `https://financial-intelligence-processing-system.onrender.com/api/v1` |

### Step 3 — Deploy

Click **Deploy**. Vercel will build and publish automatically.

### Step 4 — CORS

Once you have the Vercel deployment URL (e.g. `https://your-app.vercel.app`), add it to the backend's `ALLOWED_ORIGINS` environment variable on Render.

---

## Project Structure

```
app/
  login/           Login page
  dashboard/       KPI overview + recent cases
  cases/           Cases list + detail view
  institutions/    Institution registry
  legal/           Legal rules panel
  reports/         Reports list + report view
  referrals/       Referral tracking
  audit-logs/      System audit trail
  users/           User management (admin only)

components/
  layout/          AppLayout, Sidebar, Topbar, RouteGuard
  ui/              Badge, Modal, Pagination, Spinner, EmptyState, ErrorState

context/
  AuthContext.tsx  JWT auth state, signIn/signOut, role helpers

lib/
  api.ts           Centralized API client — all endpoints, Bearer injection, 401 handler

types/
  index.ts         Full TypeScript types for all entities
```

---

## Pages and Role Access

| Page | Route | Roles |
|------|-------|-------|
| Login | `/login` | Public |
| Dashboard | `/dashboard` | All |
| Cases | `/cases` | All |
| Case Detail | `/cases/[id]` | All |
| Institutions | `/institutions` | admin, analyst |
| Institution Detail | `/institutions/[id]` | admin, analyst |
| Legal Panel | `/legal` | All |
| Reports | `/reports` | All |
| Report View | `/reports/[id]` | All |
| Referral Tracking | `/referrals` | All |
| Audit Logs | `/audit-logs` | admin, audit_viewer |
| User Management | `/users` | admin only |

---

## Authentication

- JWT stored in `sessionStorage` (not localStorage)
- Token automatically attached to all API requests via `lib/api.ts`
- Any `401` response clears the session and redirects to `/login`
- No refresh tokens for MVP — expired sessions redirect to login

---

## Backend

API base: `https://financial-intelligence-processing-system.onrender.com/api/v1`

API docs (Swagger): `https://financial-intelligence-processing-system.onrender.com/docs`
