# Goldledger

Goldledger is a full-stack foundation for tracking fine gold through a jewellery
workshop. The repository contains an independently runnable Next.js client and
Express API.

## Project structure

```text
goldledger/
├── client/    # Next.js App Router, TypeScript, Tailwind, shadcn/ui setup
└── server/    # Express API, Prisma, PostgreSQL integration
```

## Requirements

- Node.js 20 or newer
- npm
- Docker Desktop with Docker Compose

## Local setup

Copy the root environment template to the server directory:

```powershell
Copy-Item .env.example server/.env
```

Install dependencies:

```powershell
Set-Location client
npm install

Set-Location ..\server
npm install
```

Start the API in one terminal:

```powershell
Set-Location server
npm run dev
```

The API listens on `http://localhost:4000` by default.

Start the frontend in a second terminal:

```powershell
Set-Location client
npm run dev
```

The client is available at `http://localhost:3000`.

## Verify the API

Open [http://localhost:4000/api/health](http://localhost:4000/api/health) or
run:

```powershell
Invoke-RestMethod http://localhost:4000/api/health
```

The response should contain `status: "ok"` and `service: "goldledger-api"`.

## Environment variables

See [.env.example](./.env.example). Copy it to `server/.env` for local
development. `DATABASE_URL` and `JWT_SECRET` are included for the Prisma and
authentication work that follows; they are not used by the Day 1 health route.

## Database setup

Start the PostgreSQL container:

```powershell
docker compose up -d postgres
docker compose ps
```

The Compose file creates a persistent `goldledger-postgres-data` volume and
exposes PostgreSQL on `localhost:5433` (`5432` inside the container). Copy the root environment template to
the server directory:

```powershell
Copy-Item .env.example server\.env
```

For the frontend, optionally create `client/.env.local` when the API is not
running at `http://localhost:4000`:

```powershell
Copy-Item client\.env.example client\.env.local
```

Run the initial migration, generate the Prisma client, and seed the database:

```powershell
Set-Location server
npm run db:migrate -- --name init
npm run db:generate
npm run db:seed
```

For an existing database or deployment, apply committed migrations with:

```powershell
npm run db:deploy
```

The seed creates two demo users, Murugesan, a necklace wastage rule, one job,
and the sample issue transaction. Both demo users use the local-only password
`Demo123!`; change it before using the application beyond development.

To inspect the database locally:

```powershell
Set-Location server
npx prisma studio
```

Stop the database container without deleting its data:

```powershell
Set-Location ..
docker compose stop postgres
```

To stop the container and delete the local database volume:

```powershell
docker compose down -v
```

## Authentication

The API uses JWTs in the `goldledger_token` cookie. The cookie is HttpOnly,
so frontend JavaScript cannot read it. In development it uses `SameSite=Lax`;
in production it is `Secure` and `SameSite=None` for a separately hosted
frontend and API. It expires after eight hours.

Test login with the seeded issue clerk:

```powershell
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
Invoke-WebRequest `
  -Uri http://localhost:4000/api/auth/login `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"email":"clerk@goldledger.demo","password":"Demo123!"}' `
  -WebSession $session

Invoke-RestMethod `
  -Uri http://localhost:4000/api/auth/me `
  -WebSession $session
```

The finance head account is:

```text
Email: finance@goldledger.demo
Password: Demo123!
```

Logout with the same session:

```powershell
Invoke-WebRequest `
  -Uri http://localhost:4000/api/auth/logout `
  -Method Post `
  -WebSession $session
```

The frontend must send cookies on API requests:

```javascript
fetch("http://localhost:4000/api/auth/me", {
  credentials: "include",
});
```

Protected backend routes should use `requireAuth`. Finance-only routes should
add `requireRole("FINANCE_HEAD")`; authorization is enforced by the API and
cannot be bypassed by changing a frontend URL.

## Development notes

- Backend code remains JavaScript as required.
- Frontend application code is TypeScript.
- Keep secrets in local `.env` files; do not commit them.
- Prisma commands should be run from `server/`.
