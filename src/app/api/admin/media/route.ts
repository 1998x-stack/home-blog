import {NextRequest,NextResponse} from "next/server";
import {db} from "@/lib/prisma";
import {apiUser} from "@/lib/api-auth";
import {verifyWrite,forbidden,badRequest,unauthorized} from "@/lib/csrf";
import {randomUUID,createHash} from "node:crypto";
import {mkdir,writeFile} from "node:fs/promises";
import path from "node:path";

const maxSize=5*1024*1024;
const supported:{[key:string]:{ext:string;match:(b:Buffer)=>boolean}}={
  "image/jpeg":{ext:"jpg",match:b=>b.length>=3&&b[0]===0xff&&b[1]===0xd8&&b[2]===0xff},
  "image/png":{ext:"png",match:b=>b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))},
  "image/webp":{ext:"webp",match:b=>b.toString("ascii",0,4)==="RIFF"&&b.toString("ascii",8,12)==="WEBP"},
};
export async function GET(req:NextRequest){
  if(!await apiUser(req))return unauthorized();
  const items=await db.media.findMany({orderBy:{createdAt:"desc"},take:100});
  return NextResponse.json({items},{headers:{"Cache-Control":"no-store"}});
}
export async function POST(req:NextRequest){
  if(!verifyWrite(req))return forbidden();
  const user=await apiUser(req);if(!user)return unauthorized();
  if(Number(req.headers.get("content-length")||0)>maxSize+50_000)return badRequest("Media too large",413);
  const form=await req.formData().catch(()=>null);const input=form?.get("file");
  if(!(input instanceof File)||input.size===0||input.size>maxSize)return badRequest("Invalid file or size",413);
  const entry=supported[input.type];if(!entry)return badRequest("Only JPEG, PNG or WEBP allowed");
  const data=Buffer.from(await input.arrayBuffer());
  if(!entry.match(data))return badRequest("File content/type mismatch");
  const storedName=`${randomUUID()}.${entry.ext}`;
  const dir=process.env.MEDIA_DIR||"/data/uploads";
  await mkdir(dir,{recursive:true,mode:0o700});
  await writeFile(path.join(dir,storedName),data,{flag:"wx",mode:0o600});
  const sha256=createHash("sha256").update(data).digest("hex");
  const item=await db.media.create({data:{storedName,originalName:input.name.slice(0,180),mimeType:input.type,byteSize:data.length,sha256,uploaderId:user.id}});
  return NextResponse.json({item,url:`/media/${item.id}`},{status:201,headers:{"Cache-Control":"no-store"}});
}
