# Copilot Instructions for QuickGrab

This document provides context and instructions for GitHub Copilot when working on the QuickGrab codebase.

## Project Overview

QuickGrab is an AI-powered peer-to-peer campus marketplace that enables verified students to buy and sell items safely with escrow payments and intelligent features. It focuses on AI student verification, smart search, safe escrow payments, real-time coordination, trust/rating system, and AI moderation.

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TailwindCSS v4
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL via Prisma ORM v6
- **AI**: Claude API (Anthropic) for search parsing, price checking, verification, and moderation
- **Real-time**: Socket.io for chat and notifications
- **Validation**: Zod for schema validation
- **Authentication**: JWT tokens
- **UI Components**: Custom shadcn-style components

## Project Structure

```
/app
  /(auth)             # Auth routes (signin, signup, verify)
  /(main)             # Main app routes (home, item, chat, profile, etc.)
  /api                # API routes
/components
  /ui                 # Reusable UI components (shadcn-style)
/lib
  /ai                 # AI service integrations (Claude API)
  /services           # Business logic (trust engine)
  /socket             # Socket.io client
  /utils              # Helper functions
  /validators         # Zod validation schemas
  auth.ts             # JWT authentication utilities
  db.ts               # Prisma database client
/prisma
  schema.prisma       # Database schema
  /seed               # Demo data seeder
/docs                 # Documentation
```

## Coding Conventions

### TypeScript

- Use strict TypeScript (`strict: true` in tsconfig.json)
- Prefer explicit types over `any`
- Use `@/*` path alias for imports (e.g., `@/lib/auth`, `@/components/ui`)

### React/Next.js

- Use Next.js App Router conventions
- Server components by default, add `"use client"` only when needed
- Use `NextRequest` and `NextResponse` for API routes
- Handle errors with proper HTTP status codes

### API Routes

- Located in `/app/api/`
- Use Zod schemas from `/lib/validators` for request validation
- Return JSON responses with consistent structure:
  ```typescript
  // Success
  { data: ... }
  // Error
  { error: "message" }
  ```
- Use `getUserFromRequest()` from `@/lib/auth` for authenticated routes

### Database

- Use Prisma ORM with the client from `@/lib/db`
- Models defined in `/prisma/schema.prisma`
- Key models: User, Item, Transaction, Rating, Message, Dispute
- Use UUIDs for all primary keys

### UI Components

- Use shadcn-style components from `/components/ui`
- Style with TailwindCSS utility classes
- Components: Button, Card, Input, Label, Badge, Avatar, FileUpload, Textarea

### AI Services

- AI integrations in `/lib/ai/`
- Services: search-parser, price-checker, verification, moderation, meetup
- Use Claude API through `@/lib/ai/claude`

## Development Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npx prisma generate  # Generate Prisma client
npx prisma db push   # Push schema to database
npx prisma studio    # Open database viewer
```

## Environment Variables

Required:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT tokens (min 32 chars)

Optional:
- `ANTHROPIC_API_KEY` - For Claude AI features
- `NEXT_PUBLIC_SOCKET_URL` - For real-time features

## Key Patterns

### Authentication

```typescript
import { getUserFromRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const userId = await getUserFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // ... rest of handler
}
```

### Database Access

```typescript
import { prisma } from "@/lib/db";

const items = await prisma.item.findMany({
  where: { availabilityStatus: "AVAILABLE" },
  include: { seller: true },
});
```

### Input Validation

```typescript
import { itemSchema } from "@/lib/validators";

const result = itemSchema.safeParse(await request.json());
if (!result.success) {
  return NextResponse.json({ error: result.error.message }, { status: 400 });
}
```

## Trust Score System

Trust scores (0-100) are calculated from:
- Verification status (20 points)
- Average rating (40 points)
- Deal volume (20 points)
- Reliability (20 points)

## Transaction Flow

States: `REQUESTED → ACCEPTED → PAID → MEETING → COMPLETED`

Alternative flows:
- `REQUESTED → CANCELLED`
- `PAID → REFUNDED`
