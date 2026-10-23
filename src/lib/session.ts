import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/prisma";
import { redirect } from "next/navigation";

export const sessionCookie = "home_blog_session";
export const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
export const newToken = () => randomBytes(32).toString("hex");
export function secureCookie() { return process.env.NODE_ENV === "production"; }

export async function getUser() {
  const token = (await cookies()).get(sessionCookie)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const session = await db.session.findUnique({where:{tokenHash:tokenHash(token)},include:{user:true}});
  if (!session || session.expiresAt <= new Date() || session.user.disabled) return null;
  return session.user;
}
export async function requireUser() { const user=await getUser(); if(!user) redirect("/admin/login/"); return user; }
export async function requireAdmin() { const user=await requireUser(); if(user.role!=="ADMIN") redirect("/admin/"); return user; }
