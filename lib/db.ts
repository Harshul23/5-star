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
    // Datasource configuration handled via DATABASE_URL
  });

// In development, reuse the same client across hot reloads
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
