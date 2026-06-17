import type { Prisma, PrismaClient } from "@/app/generated/prisma/client";

/** Prisma client or interactive transaction client — use for all tenant DB writes. */
export type DbExecutor = PrismaClient | Prisma.TransactionClient;
