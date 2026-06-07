import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

const connectionLimit = parseInt(process.env.DB_CONNECTION_LIMIT || '10');
const idleTimeout = parseInt(process.env.DB_IDLE_TIMEOUT || '60');

let datasourceUrl = process.env.DATABASE_URL;
if (datasourceUrl && datasourceUrl.includes('mysql://')) {
  const params = new URLSearchParams();
  params.set('connection_limit', connectionLimit.toString());
  params.set('idle_timeout', idleTimeout.toString());
  const sep = datasourceUrl.includes('?') ? '&' : '?';
  datasourceUrl = datasourceUrl + sep + params.toString();
}

export const prisma =
  globalForPrisma.__prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['warn', 'error'] : ['query', 'warn', 'error'],
    datasourceUrl,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__prisma = prisma;
}
