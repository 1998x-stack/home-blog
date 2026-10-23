import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { verifyWrite,forbidden,badRequest } from "@/lib/csrf";
import { loginInput } from "@/lib/validation";
import { passwordValid } from "@/lib/password";
import { newToken, tokenHash, sessionCookie, secureCookie } from "@/lib/session";
import { createHmac } from "node:crypto";

export async function POST(request:NextRequest){
  if(!verifyWrite(request)) return forbidden();
  if(Number(request.headers.get("content-length")||0)>4096) return badRequest("Request too large",413);
  const parsed=loginInput.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return badRequest("Invalid credentials");
  const email=parsed.data.email;
  const key=createHmac("sha256",process.env.CSRF_SECRET!).update(email).digest("hex");
  const after=new Date(Date.now()-15*60*1000);
  const attempts=await db.loginAttempt.count({where:{key,createdAt:{gte:after}}});
  if(attempts>=8)return badRequest("Too many attempts; try again later",429);
  const user=await db.user.findUnique({where:{email}});
  const valid=user && !user.disabled && await passwordValid(parsed.data.password,user.passwordHash);
  if(!valid){await db.loginAttempt.create({data:{key}});return badRequest("Invalid credentials",401);}
  const token=newToken();
  const expiresAt=new Date(Date.now()+7*86400_000);
  await db.$transaction([
    db.session.create({data:{userId:user.id,tokenHash:tokenHash(token),expiresAt}}),
    db.loginAttempt.deleteMany({where:{key}}),
    db.session.deleteMany({where:{expiresAt:{lt:new Date()}}}),
  ]);
  const res=NextResponse.json({ok:true});
  res.cookies.set(sessionCookie,token,{path:"/",httpOnly:true,sameSite:"strict",secure:secureCookie(),expires:expiresAt});
  res.headers.set("Cache-Control","no-store");
  return res;
}
