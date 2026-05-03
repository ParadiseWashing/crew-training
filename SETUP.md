# Crew Training — Setup Guide

## Quick Start

### 1. Prerequisites
- Node.js 18+
- PostgreSQL database (local or hosted)

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment
Copy `.env.example` to `.env` and fill in your values:
```bash
cp .env.example .env
```

Required variables:
```
DATABASE_URL="postgresql://user:password@localhost:5432/crew_training"
AUTH_SECRET="run: openssl rand -base64 32"
AUTH_URL="http://localhost:3000"
```

### 4. Set up the database
```bash
# Push schema to database (creates tables)
npm run db:push

# Seed with demo data
npm run db:seed
```

### 5. Run development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Demo Accounts

| Role    | Email                      | Password   |
|---------|----------------------------|------------|
| Admin   | admin@crewtraining.com     | admin123   |
| Trainee | crew@crewtraining.com      | crew123    |
| Trainee | marcus@crewtraining.com    | crew123    |

---

## Database Commands

```bash
npm run db:push        # Apply schema changes (dev)
npm run db:migrate     # Create a migration (production)
npm run db:seed        # Seed demo data
npm run db:studio      # Open Prisma Studio (GUI)
npm run db:reset       # Reset DB + re-seed (destructive!)
```

---

## Deployment (Vercel)

1. Push to GitHub
2. Import project in Vercel
3. Set environment variables:
   - `DATABASE_URL` — your PostgreSQL connection string
   - `AUTH_SECRET` — `openssl rand -base64 32`
   - `AUTH_URL` — your production URL (e.g. `https://your-app.vercel.app`)
4. Deploy

For the database, use [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres), [Neon](https://neon.tech), or [Supabase](https://supabase.com).

**After first deploy**, run the seed command once:
```bash
npx prisma db push  # via Vercel CLI or local with PROD DATABASE_URL
tsx prisma/seed.ts
```

---

## Tech Stack

| Layer         | Technology                    |
|---------------|-------------------------------|
| Framework     | Next.js 16 (App Router)       |
| Styling       | Tailwind CSS v4               |
| Database      | PostgreSQL                    |
| ORM           | Prisma 7                      |
| Auth          | NextAuth v5 (Credentials/JWT) |
| Rich Text     | Tiptap v3                     |
| State         | Zustand + React Query         |
| Components    | Radix UI primitives           |

---

## Application Structure

```
app/
├── login/              # Auth page
├── admin/              # Admin portal (ADMIN role required)
│   ├── dashboard/      # Overview & stats
│   ├── content/        # Subject/Topic/Step management
│   ├── people/         # Users & Job Roles
│   ├── reports/        # Completion & quiz reports
│   └── settings/       # App settings
├── trainee/            # Trainee portal
│   ├── home/           # My assignments
│   ├── subjects/       # Content viewer + quiz
│   ├── progress/       # Progress overview
│   └── directory/      # Crew directory
└── api/                # REST API routes
    ├── auth/
    ├── subjects/
    ├── topics/
    ├── steps/
    ├── users/
    ├── job-roles/
    ├── assignments/
    ├── quizzes/
    ├── progress/
    ├── sign-off/
    └── reports/

prisma/
├── schema.prisma       # Database schema
└── seed.ts             # Demo data seed script

lib/
├── auth.ts             # NextAuth configuration
├── prisma.ts           # Prisma client singleton
└── utils.ts            # Helpers

components/
├── ui/                 # Base UI components
├── shared/             # Sidebar, headers, stat cards
└── admin/ trainee/     # Feature-specific components
```

---

## Content Hierarchy

```
Subject (e.g. "Window Cleaning Mastery")
└── Topic (e.g. "Squeegee Technique")
    ├── Steps (rich text content pages)
    └── Quiz (optional, with pass threshold)
```

**Job Role → Subject assignment** is the core automation:
when you assign a Job Role to a user, they automatically receive all subjects linked to that role.
