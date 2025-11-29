import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Configure Prisma Client with optimizations for Neon DB
// Neon uses serverless PostgreSQL with connection pooling
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    // Enable connection pooling optimizations
    datasourceUrl: process.env.DATABASE_URL,
  });

// Recommended: Enable connection pooling for serverless
// Ensure DATABASE_URL uses pooled connection string from Neon:
// postgresql://user:password@ep-xxx-pooler.region.aws.neon.tech/dbname?sslmode=require&pgbouncer=true

// In development, reuse the same client across hot reloads
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
