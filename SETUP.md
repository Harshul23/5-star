# QuickGrab Setup Guide

This guide will help you set up the QuickGrab development environment.

## Prerequisites

Before you begin, make sure you have the following installed:

- **Node.js 18+** - [Download from nodejs.org](https://nodejs.org/)
- **PostgreSQL** - [Download from postgresql.org](https://www.postgresql.org/download/)
- **npm** or **yarn** - Comes with Node.js

## Step 1: Clone the Repository

```bash
git clone https://github.com/Harshul23/5-star.git
cd 5-star
```

## Step 2: Install Dependencies

```bash
npm install
```

## Step 3: Environment Variables

Create a `.env` file in the root directory by copying from the example:

```bash
cp .env.example .env
```

Edit the `.env` file with your configuration:

```env
# Database Connection
DATABASE_URL="postgresql://username:password@localhost:5432/quickgrab"

# JWT Authentication
JWT_SECRET="your-secure-secret-key-min-32-chars"

# AI Features (Optional)
ANTHROPIC_API_KEY="your-anthropic-api-key"

# Socket.io (for real-time features)
NEXT_PUBLIC_SOCKET_URL="http://localhost:3001"
```

### Environment Variables Explained

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `JWT_SECRET` | Secret key for JWT tokens (min 32 characters for security) | Yes |
| `EMAIL_HOST` | SMTP server hostname for email delivery | Optional* |
| `EMAIL_PORT` | SMTP server port (default: 587) | Optional |
| `EMAIL_USER` | SMTP username/email | Optional* |
| `EMAIL_PASSWORD` | SMTP password or app password | Optional* |
| `EMAIL_FROM` | Sender email address | Optional |
| `ANTHROPIC_API_KEY` | API key for Claude AI features (verification, moderation) | Optional |
| `NEXT_PUBLIC_SOCKET_URL` | URL for Socket.io server | Optional |

\* **Email Configuration:** Required for OTP email delivery in production. See [Email Setup Guide](./docs/EMAIL_SETUP.md) for detailed instructions on configuring email providers like Gmail, SendGrid, or Mailgun.

## Step 4: Set Up PostgreSQL Database

1. **Create a new database:**

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE quickgrab;

# Exit psql
\q
```

2. **Update your `.env` file** with the correct database credentials.

## Step 5: Initialize Prisma

Generate the Prisma client and push the schema to your database:

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database (creates tables)
npx prisma db push
```

### Optional: View Database with Prisma Studio

```bash
npx prisma studio
```

This opens a web-based database viewer at `http://localhost:5555`.

## Step 6: Run the Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

## Authentication System

QuickGrab uses JWT (JSON Web Tokens) for authentication. Here's how it works:

### Registration Flow

1. User submits registration form (`/signup`)
2. API creates user with hashed password
3. OTP is generated and sent to user's email
   - If email is configured: OTP is sent via SMTP
   - In development without email: OTP is logged to console and returned in API response
4. User can resend OTP if needed (rate limited to once per 60 seconds)
5. User verifies email with OTP (expires after 10 minutes)
6. Optional: User uploads student ID for AI verification

### Login Flow

1. User submits login form (`/signin`)
2. API validates credentials against hashed password
3. JWT token is generated and returned
4. Token is stored in localStorage
5. Token is included in Authorization header for API requests

### JWT Configuration

The JWT token:
- Expires after 7 days
- Contains the user ID as payload
- Is required for protected API routes

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

## Project Structure

```
├── app/
│   ├── (auth)/           # Auth pages (signin, signup)
│   ├── (main)/           # Main app pages
│   ├── api/              # API routes
│   └── page.tsx          # Landing page
├── components/
│   └── ui/               # UI components
├── lib/
│   ├── ai/               # AI services
│   ├── auth.ts           # Authentication utilities
│   ├── db.ts             # Database client
│   └── validators/       # Zod validation schemas
├── prisma/
│   └── schema.prisma     # Database schema
└── docs/                 # Documentation
```

## Troubleshooting

### Common Issues

1. **"Environment variable not found: DATABASE_URL" error**
   - Make sure you have created a `.env` file in the root directory
   - Copy from the example: `cp .env.example .env`
   - Edit `.env` and set your PostgreSQL connection string:
     ```
     DATABASE_URL="postgresql://postgres:password@localhost:5432/quickgrab"
     ```
   - Restart the development server after changing `.env`

2. **Database connection error**
   - Ensure PostgreSQL is running
   - Verify `DATABASE_URL` in `.env` is correct
   - Check that the database exists

2. **JWT_SECRET not set error**
   - Add `JWT_SECRET` to your `.env` file
   - In development, a default is used (with warning)
   - In production, this is required

3. **Prisma client not generated**
   - Run `npx prisma generate`
   - Ensure `@prisma/client` is in devDependencies

4. **Build errors**
   - Delete `.next` folder and rebuild
   - Run `npm install` to ensure all dependencies are installed

### Getting Help

- Check the [API documentation](./docs/API.md)
- Review the [architecture documentation](./docs/ARCHITECTURE.md)
- [Open an issue on GitHub](https://github.com/Harshul23/5-star/issues)

## Security Notes

- Never commit `.env` files to version control
- Use a strong, unique `JWT_SECRET` in production
- Keep your dependencies updated
- Use HTTPS in production

## Next Steps

After setup, you can:

1. Visit `http://localhost:3000/signup` to create an account
2. Visit `http://localhost:3000/signin` to sign in
3. Explore the home page at `http://localhost:3000/home`
4. List an item at `http://localhost:3000/list-item`
