import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

const connectionLimit = parseInt(process.env.DB_CONNECTION_LIMIT || '10');
const idleTimeout = parseInt(process.env.DB_IDLE_TIMEOUT || '60');

export const prisma =
  globalForPrisma.__prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['warn', 'error'] : ['query', 'warn', 'error'],
    datasourceUrl: process.env.DATABASE_URL,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__prisma = prisma;
}
