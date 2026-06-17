import { statSync } from "node:fs";
import { join } from "node:path";

import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const GENERATED_CLIENT_PATH = join(
  process.cwd(),
  "app/generated/prisma/client.ts",
);

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaClientMtime: number | undefined;
};

function getGeneratedClientMtime(): number {
  if (process.env.NODE_ENV === "production") {
    return 0;
  }

  try {
    return statSync(GENERATED_CLIENT_PATH).mtimeMs;
  } catch {
    return 0;
  }
}

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);

  return new PrismaClient({ adapter });
}

function getPrismaClient(): PrismaClient {
  const generatedMtime = getGeneratedClientMtime();
  const cached = globalForPrisma.prisma;

  if (
    cached &&
    (process.env.NODE_ENV === "production" ||
      globalForPrisma.prismaClientMtime === generatedMtime)
  ) {
    return cached;
  }

  const client = createPrismaClient();

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
    globalForPrisma.prismaClientMtime = generatedMtime;
  }

  return client;
}

export const prisma = getPrismaClient();

export type DbClient = typeof prisma;
