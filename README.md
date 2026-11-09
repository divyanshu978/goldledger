# GoldLedger

GoldLedger is a full-stack jewellery workshop accountability system. It
tracks fine gold issued to karigars, returned jewellery, wastage, vault stock,
and finance review decisions.

The project is intentionally conservative about accounting:

- Fine gold is calculated on the server.
- Decimal arithmetic is used for accounting values.
- AI readings are suggestions only.
- Original transactions are preserved.
- Stock changes are based on auditable, accepted events.

## Contents

- [Product scope](#product-scope)
- [Technology](#technology)
- [Repository structure](#repository-structure)
- [Requirements](#requirements)
- [Local setup](#local-setup)
- [Environment configuration](#environment-configuration)
- [Database and seed data](#database-and-seed-data)
- [Running the application](#running-the-application)
- [Demo credentials](#demo-credentials)
- [Authentication](#authentication)
- [Application workflows](#application-workflows)
- [Workflow API reference](#application-workflows)
- [AI-assisted image extraction](#ai-assisted-image-extraction)
- [Testing](#testing)
- [Accounting and security rules](#accounting-and-security-rules)
- [Development notes](#development-notes)

## Product scope

GoldLedger supports two roles:

| Role | Responsibilities |
| --- | --- |
| `ISSUE_CLERK` | Manage karigars, issue gold, record returns |
| `FINANCE_HEAD` | All clerk actions plus stock statements, return approval, wastage review, and alert management |

Implemented application pages:

- `/dashboard`
- `/karigars`
- `/karigars/[id]`
- `/gold-issue`
- `/gold-return`
- `/finance-review`
- `/wastage-alerts`
- `/stock-statement`

## Technology

- **Frontend:** Next.js App Router, React, TypeScript, Tailwind CSS, Lucide
- **Backend:** Node.js, Express, CommonJS JavaScript
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Authentication:** JWT in an HttpOnly cookie
- **Validation:** Zod
- **Accounting:** Prisma Decimal with three-decimal `ROUND_HALF_UP` rounding
- **Image uploads:** Multer memory storage

## Repository structure

```text
goldledger/
├── client/
│   └── src/
│       ├── app/              # Next.js routes and pages
│       ├── components/       # Shared shell and UI components
│       └── lib/api.ts        # Typed frontend API client
├── server/
│   ├── prisma/
│   │   ├── schema.prisma     # Database schema
│   │   ├── migrations/       # Committed migrations
│   │   └── seed.js           # Development seed
│   ├── src/
│   │   ├── controller/       # Request validation and responses
│   │   ├── middleware/       # Authentication and role checks
│   │   ├── routes/           # Express routes
│   │   └── service/          # Business logic
│   └── test/                 # Node test runner tests
├── docker-compose.yml
└── .env.example
```

## Requirements

- Node.js 20 or newer
- npm
- Docker Desktop with Docker Compose

## Local setup

### 1. Configure the backend

From the repository root:

```powershell
Copy-Item .env.example server\.env
```

Edit `server\.env` and set a development `JWT_SECRET` with at least 32
characters.

### 2. Install dependencies

```powershell
Set-Location client
npm install

Set-Location ..\server
npm install
```

### 3. Start PostgreSQL

```powershell
Set-Location ..
docker compose up -d postgres
docker compose ps
```

PostgreSQL is exposed at `localhost:5433` and uses port `5432` inside the
container.

### 4. Prepare the database

```powershell
Set-Location server
npm run db:migrate -- --name init
npm run db:generate
npm run db:seed
```

For an existing database or deployment, use committed migrations:

```powershell
npm run db:deploy
npm run db:generate
```

## Environment configuration

The root [.env.example](./.env.example) is the source template. Copy it to
`server\.env`.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | JWT signing secret, minimum 32 characters |
| `PORT` | No | API port, defaults to `4000` |
| `CLIENT_ORIGIN` | No | Allowed frontend origin, defaults to `http://localhost:3000` |
| `NODE_ENV` | No | `development`, `test`, or `production` |
| `GEMINI_API_KEY` | For image extraction | Server-side Gemini API key |
| `GEMINI_API_URL` | No | Gemini `generateContent` endpoint template; include `{model}` |
| `GEMINI_MODEL` | No | Gemini vision model name |

Never put `GEMINI_API_KEY`, `DATABASE_URL`, or `JWT_SECRET` in the frontend.

If the API is not running on port `4000`, optionally create
`client\.env.local`:

```powershell
Copy-Item client\.env.example client\.env.local
```

Set `NEXT_PUBLIC_API_URL` to the backend URL.

## Database and seed data

The development seed is idempotent and does not reset the database. It creates:

- Two demo users
- Two authentication test users
- Five fictional karigars
- Category-specific wastage rules
- A sample job and issue transaction
- Development opening vault stock

To inspect the database:

```powershell
Set-Location server
npx prisma studio
```

Stop PostgreSQL without removing data:

```powershell
Set-Location ..
docker compose stop postgres
```

Remove the local database volume only when intentionally resetting local data:

```powershell
docker compose down -v
```

## Running the application

Start the backend in one terminal:

```powershell
Set-Location server
npm run dev
```

The API listens at `http://localhost:4000`.

Start the frontend in a second terminal:

```powershell
Set-Location client
npm run dev
```

The frontend is available at `http://localhost:3000`.

Verify the API:

```powershell
Invoke-RestMethod http://localhost:4000/api/health
```

Expected response:

```json
{
  "status": "ok",
  "service": "goldledger-api"
}
```

## Demo credentials

These credentials are for local development only.

| User | Email | Password |
| --- | --- | --- |
| Issue Clerk | `clerk@goldledger.demo` | `Demo123!` |
| Finance Head | `finance@goldledger.demo` | `Demo123!` |
| Auth Test Clerk | `auth-clerk@goldledger.test` | `ClerkPassword123!` |
| Auth Test Finance | `auth-finance@goldledger.test` | `FinancePassword123!` |

Change development passwords before using the system outside a local demo.

## Authentication

Authentication uses a JWT stored in the `goldledger_token` HttpOnly cookie.
Frontend requests must include credentials:

```javascript
fetch("http://localhost:4000/api/auth/me", {
  credentials: "include",
});
```

### Login with PowerShell

```powershell
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

Invoke-WebRequest `
  -Uri http://localhost:4000/api/auth/login `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"email":"finance@goldledger.demo","password":"Demo123!"}' `
  -WebSession $session

Invoke-RestMethod `
  -Uri http://localhost:4000/api/auth/me `
  -WebSession $session
```

Available authentication endpoints:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/login` | Authenticate and set the cookie |
| `GET` | `/api/auth/me` | Return the current user |
| `POST` | `/api/auth/logout` | Clear the cookie |

## Application workflows

### 1. Karigar master

Karigars have category-specific wastage rules. A karigar can be deactivated
instead of deleted when transaction history exists.

```text
GET    /api/karigars
GET    /api/karigars/:id
POST   /api/karigars
PATCH  /api/karigars/:id
PATCH  /api/karigars/:id/status
GET    /api/karigars/:id/ledger
```

List query parameters:

- `page`
- `pageSize`
- `search` — matches name or karigar code
- `isActive=true|false`

Create example:

```powershell
Invoke-RestMethod `
  -Uri http://localhost:4000/api/karigars `
  -Method Post `
  -WebSession $session `
  -ContentType "application/json" `
  -Body '{"karigarCode":"KAR-010","name":"Demo Kumar","phone":"9000000010","wastageRules":[{"itemCategory":"NECKLACE","allowedWastagePercent":3},{"itemCategory":"RING","allowedWastagePercent":1.5}]}'
```

### 2. Issue gold

```text
POST /api/gold-issues
```

Request:

```json
{
  "karigarId": "karigar-uuid",
  "grossWeight": "120.000",
  "purity": "91.60",
  "category": "NECKLACE",
  "dueDate": "2026-12-15",
  "notes": "Demo issue"
}
```

The server calculates fine gold, checks available vault stock, creates the job
and issue transaction atomically, and snapshots the category wastage rule onto
the job. `fineGoldWeight` is never accepted from the client.

### 3. Return gold

```text
GET  /api/gold-returns/jobs
POST /api/gold-returns
```

Return types:

- `FINISHED_JEWELLERY`
- `SCRAP`
- `FILINGS`

Request:

```json
{
  "jobId": "job-uuid",
  "returnType": "FINISHED_JEWELLERY",
  "grossWeight": "110.000",
  "purity": "91.60",
  "notes": "Demo return"
}
```

The server calculates fine gold, prevents returns above the outstanding
balance, preserves the original issue transaction, and creates a separate
return transaction. New returns start as `PENDING_REVIEW`.

### 4. Finance return review

```text
GET   /api/finance-reviews
PATCH /api/finance-reviews/:transactionId
```

Only `FINANCE_HEAD` can review returns.

Accept:

```json
{
  "decision": "ACCEPTED"
}
```

Reject:

```json
{
  "decision": "REJECTED",
  "rejectionReason": "Purity certificate is missing"
}
```

Review statuses are:

- `PENDING_REVIEW`
- `ACCEPTED`
- `REJECTED`

Rejection reasons are mandatory. Decisions are one-time operations. Reviewer
ID, timestamp, decision, and rejection reason are stored, and an `AuditLog`
entry is created.

Only accepted returns affect vault stock. Pending and rejected returns remain
in the transaction history but do not increase available stock.

### 5. Wastage review and alerts

```text
GET   /api/wastage-alerts?status=all|pending|resolved
GET   /api/wastage-alerts/:jobId
POST  /api/wastage-alerts/:jobId/submit
PATCH /api/wastage-alerts/:alertId/resolve
```

Wastage is calculated using fine gold:

```text
actual difference = issued fine gold - returned fine gold
allowed wastage   = issued fine gold * applied percentage / 100
excess wastage    = max(0, actual difference - allowed wastage)
```

Open and partially returned jobs are provisional. Completed jobs or jobs
submitted by finance are finalized. Excess wastage creates an alert without
changing accounting balances.

### 6. Vault stock statement

```text
GET /api/stock-statement
```

This endpoint is restricted to `FINANCE_HEAD`. It returns:

- Opening stock
- Received stock
- Issued gold
- Accepted returns
- Adjustments
- Closing stock
- Outstanding gold with karigars
- Auditable transaction history

Closing stock is calculated by the backend and cannot be submitted by the
frontend. All stock calculations use fine-gold weights, not gross weights.

### 7. Karigar ledger

```text
GET /api/karigars/:id/ledger
```

The ledger includes issued fine gold, returned fine gold, outstanding balance,
and transaction history ordered newest first.

## AI-assisted image extraction

The return form supports an optional scale-photo reading workflow:

```text
POST /api/image-extractions
```

Upload a multipart form field named `image`.

Accepted files:

- JPEG
- PNG
- WebP
- Maximum size: 5 MB

The server verifies the file signature, keeps the image in memory only, and
sends it to the configured vision provider. The provider must return
structured JSON containing:

```json
{
  "grossWeight": "12.345",
  "purity": "91.60",
  "unit": "g",
  "visibleReading": "12.345 g / 91.60",
  "confidence": 0.94,
  "uncertainty": null
}
```

AI output is untrusted. The server validates the weight, purity, and unit
before returning it as a suggestion. The AI never supplies fine gold, creates a
transaction, or updates stock. Users can edit the values and must explicitly
confirm them before submitting the existing return form.

Configure the provider only on the backend:

```env
GEMINI_API_KEY=your-server-side-gemini-key
GEMINI_API_URL=https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
GEMINI_MODEL=gemini-3.1-flash-lite
```

Provider errors, malformed JSON, unsupported files, unreadable images, invalid
weights, and invalid purity values return controlled errors and leave manual
entry available.

## API conventions

- Protected routes require the authenticated cookie.
- Finance-only routes enforce `FINANCE_HEAD` on the server.
- Request bodies are validated with Zod.
- Decimal accounting inputs are decimal strings.
- Success responses use JSON.
- Validation errors return `400`.
- Authentication failures return `401`.
- Permission failures return `403`.
- Business conflicts, such as insufficient stock or duplicate decisions,
  return `409`.
- Provider or database availability errors are surfaced explicitly.

## Testing

Run the complete backend suite:

```powershell
Set-Location server
npm test
```

The suite covers:

- Authentication and role enforcement
- Fine-gold calculation and Decimal rounding
- Karigar CRUD and wastage rules
- Gold issue and vault stock checks
- Gold returns and outstanding balances
- Finance return approval and rejection
- Duplicate review decisions
- Clerk authorization failures
- Wastage calculations and alerts
- Stock statement calculations
- Mocked AI image extraction responses

Run frontend validation:

```powershell
Set-Location client
npm run lint
npm run build
```

## Accounting and security rules

1. Never use JavaScript floating-point arithmetic for accounting.
2. Fine gold is calculated from gross weight and purity on the server.
3. AI output is never trusted as an accounting decision.
4. The frontend cannot submit fine gold or closing stock.
5. Return transactions are never overwritten.
6. Only accepted returns increase available vault stock.
7. Wastage rules are snapshotted when a job is created.
8. Rejected and pending returns remain auditable.
9. API keys and database credentials remain server-side.
10. Karigars with transaction history are deactivated, not deleted.

## Development notes

- Run Prisma commands from `server\`.
- Backend source is JavaScript; frontend source is TypeScript.
- Keep secrets in local environment files and never commit them.
- Do not use the development seed against production data.
- The project currently has no stock-adjustment workflow; adjustments are
  reported as `0.000` until an audited adjustment module is added.
