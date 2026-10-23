import {NextRequest,NextResponse} from "next/server";
import {readFile} from "node:fs/promises";
import path from "node:path";
import {db} from "@/lib/prisma";
import {apiUser} from "@/lib/api-auth";
export async function GET(req:NextRequest,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  if(!/^c[a-z0-9]{20,40}$/.test(id))return new Response("Not found",{status:404});
  const record=await db.media.findUnique({where:{id}});
  if(!record || (!record.isPublic && !await apiUser(req)))return new Response("Not found",{status:404});
  if(!/^[a-f0-9-]{36}\.(jpg|png|webp)$/.test(record.storedName))return new Response("Not found",{status:404});
  try {const b=await readFile(path.join(process.env.MEDIA_DIR||"/data/uploads",record.storedName));
    return new NextResponse(new Uint8Array(b),{headers:{"Content-Type":record.mimeType,"Content-Length":String(b.length),"X-Content-Type-Options":"nosniff","Cache-Control":record.isPublic?"public, max-age=3600":"private, no-store"}});
  } catch{return new Response("Not found",{status:404});}
}
