import "server-only";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required");
const globalDb = globalThis as unknown as { homeBlogDb?: PrismaClient };
export const db = globalDb.homeBlogDb ?? new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });
if (process.env.NODE_ENV !== "production") globalDb.homeBlogDb = db;
