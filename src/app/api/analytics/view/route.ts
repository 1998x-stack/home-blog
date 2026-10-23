import { NextRequest, NextResponse } from "next/server";
import { allowedPageKey, recordPageView } from "@/lib/analytics";

export const dynamic="force-dynamic";
export async function POST(req:NextRequest) {
  const expected = process.env.APP_ORIGIN?.replace(/\/$/,"");
  // Only same-origin browser navigation. Must also rate-limit at the public proxy.
  if (!expected || req.headers.get("origin")!==expected ||
      (req.headers.get("sec-fetch-site") && req.headers.get("sec-fetch-site")!=="same-origin") ||
      !req.headers.get("content-type")?.toLowerCase().startsWith("application/json") ||
      Number(req.headers.get("content-length")||0)>250) {
    return new Response(null,{status:403,headers:{"Cache-Control":"no-store"}});
  }
  if (!req.body) return new Response(null,{status:400});
  const reader=req.body.getReader();
  const chunks:Uint8Array[]=[];
  let total=0;
  while (true) {
    const {done,value}=await reader.read();
    if (done) break;
    total+=value.byteLength;
    if(total>250){await reader.cancel();return new Response(null,{status:413});}
    chunks.push(value);
  }
  const bytes=new Uint8Array(total);
  let pos=0;
  for (const chunk of chunks){bytes.set(chunk,pos);pos+=chunk.byteLength;}
  let input:unknown;
  try{input=JSON.parse(new TextDecoder().decode(bytes));}
  catch{return new Response(null,{status:400});}
  const page = await allowedPageKey(input && typeof input==="object" && "path" in input ? input.path : null);
  if (page) await recordPageView(page);
  // Same response regardless of whether the path is accepted; do not leak unpublished slugs.
  return new NextResponse(null,{status:204,headers:{"Cache-Control":"no-store"}});
}
