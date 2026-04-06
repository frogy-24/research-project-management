import "dotenv/config";
import { PrismaClient } from "../prisma/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = global as unknown as {
  prisma: PrismaClient;
  pool: Pool;
};

// Parse DATABASE_URL để tránh lỗi password type
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not defined');
}

const pool = globalForPrisma.pool || new Pool({
  connectionString,
  // Explicitly set password as string if present
  ...(connectionString.includes('@') && {
    ssl: false,
  }),
});

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.pool = pool;
}

const adapter = new PrismaPg(pool as any);

function hasRoomDelegate(client: PrismaClient): boolean {
  const candidate = client as unknown as {
    room?: { findMany?: unknown };
  };

  return typeof candidate.room?.findMany === 'function';
}

const cachedPrisma = globalForPrisma.prisma;
const shouldReuseCachedClient = cachedPrisma ? hasRoomDelegate(cachedPrisma) : false;

const prisma =
  shouldReuseCachedClient
    ? cachedPrisma
    : new PrismaClient({
        adapter,
        log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
      });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
