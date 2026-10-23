import { NextRequest,NextResponse } from "next/server";
import {verifyWrite,forbidden} from "@/lib/csrf";
import {db} from "@/lib/prisma";
import {sessionCookie,tokenHash} from "@/lib/session";
export async function POST(req:NextRequest){
  if(!verifyWrite(req))return forbidden();
  const token=req.cookies.get(sessionCookie)?.value;
  if(token && /^[a-f0-9]{64}$/.test(token))await db.session.deleteMany({where:{tokenHash:tokenHash(token)}});
  const res=NextResponse.json({ok:true});
  res.cookies.set(sessionCookie,"",{path:"/",maxAge:0,httpOnly:true,sameSite:"strict"});
  res.headers.set("Cache-Control","no-store");return res;
}
