# Goldledger

Goldledger is a full-stack application with a Next.js client and an Express/Prisma server.

## Project structure

```text
goldledger/
├── client/    # Next.js frontend
└── server/    # Express API and Prisma database layer
```

## Requirements

- Node.js 18 or newer
- npm
- PostgreSQL for the server database

## Getting started

Install dependencies in both applications:

```bash
cd client
npm install

cd ../server
npm install
```

Create a `server/.env` file and configure the database connection:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE"
```

Start the client development server:

```bash
cd client
npm run dev
```

The client is available at [http://localhost:3000](http://localhost:3000).

## Server

The server uses Express, PostgreSQL, and Prisma. Prisma commands can be run from the `server` directory:

```bash
cd server
npx prisma generate
npx prisma migrate dev
```

The server package currently does not define a start or development script. Add the appropriate script once the API entry point is finalized.

## Environment files

Environment files are intentionally ignored by Git. Keep local secrets in `server/.env` and provide a safe `.env.example` when sharing required variable names.

## Development notes

- Keep frontend code in `client/`.
- Keep API, middleware, services, routes, and database code in `server/`.
- Do not commit `node_modules`, build output, local databases, logs, or secrets.
