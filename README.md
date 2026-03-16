# Med Revision OS V2

A stronger full-stack starter for a medical revision platform inspired by modern tools like AMBOSS.

## Included in V2
- Email/password authentication with cookie sessions
- Protected student routes
- Admin-only content management
- Personal question attempts and topic mastery
- Readiness score, streak logic, and weak-topic analytics
- Spaced repetition flashcards with AGAIN / HARD / GOOD / EASY
- Topic library, Qbank, clinical cases, and seed data

## Tech stack
- Next.js App Router
- Prisma ORM
- SQLite for fast local setup
- TypeScript

## Quick start
```bash
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:push
npm run seed
npm run dev
```

## Demo accounts after seeding
- Admin: `admin@medrev.local` / `Admin12345!`
- Student: `student@medrev.local` / `Student12345!`

## Suggested next upgrades
- PostgreSQL + file uploads
- Rich-text lesson editor
- AI tutor endpoints
- Exam simulator mode
- Notes / highlights / bookmarks
- Email verification and password reset
