import type { NextRequest } from "next/server";
import { db } from "@/lib/prisma";
import { tokenHash, sessionCookie } from "@/lib/session";
export async function apiUser(request: NextRequest) {
  const token=request.cookies.get(sessionCookie)?.value;
  if(!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const sess=await db.session.findUnique({where:{tokenHash:tokenHash(token)},include:{user:true}});
  return sess && sess.expiresAt>new Date()&&!sess.user.disabled ? sess.user : null;
}
