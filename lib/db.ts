import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";

// Extended PrismaClient type with Accelerate extension
type ExtendedPrismaClient = ReturnType<typeof createPrismaClient>;

function createPrismaClient() {
  return new PrismaClient().$extends(withAccelerate());
}

const globalForPrisma = globalThis as { prisma?: ExtendedPrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// In development, store the client globally to avoid hot-reload issues
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
