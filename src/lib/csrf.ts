import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { secureCookie } from "@/lib/session";

const cookieName="home_blog_csrf";
function secret(){ const val=process.env.CSRF_SECRET; if(!val || val.length<32) throw new Error("CSRF_SECRET must be >= 32 characters");return val; }
function sign(nonce:string){return createHmac("sha256",secret()).update(nonce).digest("hex");}
export function issueCsrf() {
  const nonce=randomBytes(24).toString("hex"); const value=`${nonce}.${sign(nonce)}`;
  const res=NextResponse.json({csrf:value},{headers:{"Cache-Control":"no-store"}});
  res.cookies.set(cookieName,value,{httpOnly:true,secure:secureCookie(),sameSite:"strict",path:"/",maxAge:2*60*60});
  return res;
}
function eq(a:string,b:string){const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length && timingSafeEqual(x,y);}
export function verifyWrite(request:NextRequest): boolean {
  // Strict same-origin check; never derive trusted origin from attacker-controlled forwarded headers.
  const expected=process.env.APP_ORIGIN;
  if(!expected || !/^https?:\/\//.test(expected)) return false;
  if(request.headers.get("origin")!==expected.replace(/\/$/,"")) return false;
  if(!request.headers.get("content-type")?.toLowerCase().startsWith("application/json") && !request.headers.get("content-type")?.toLowerCase().startsWith("multipart/form-data")) return false;
  const supplied=request.headers.get("x-csrf-token")||"";
  const stored=request.cookies.get(cookieName)?.value||"";
  if(!supplied || !stored || !eq(supplied,stored)) return false;
  const [nonce,mac]=stored.split(".");
  return !!nonce && /^[a-f0-9]{48}$/.test(nonce) && /^[a-f0-9]{64}$/.test(mac||"") && eq(mac,sign(nonce));
}
export function forbidden(){return NextResponse.json({error:"Forbidden"},{status:403,headers:{"Cache-Control":"no-store"}});}
export function badRequest(error="Invalid request",status=400){return NextResponse.json({error},{status,headers:{"Cache-Control":"no-store"}});}
export function unauthorized(){return badRequest("Authentication required",401);}
export function noStore<T extends Response>(response:T){ response.headers.set("Cache-Control","no-store");return response; }
