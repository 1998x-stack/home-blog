import { NextRequest,NextResponse } from "next/server";
import {db} from "@/lib/prisma";
import {publishMedia} from "@/lib/publish-media";
import {apiUser} from "@/lib/api-auth";
import {articleInput} from "@/lib/validation";
import {verifyWrite,forbidden,badRequest,unauthorized} from "@/lib/csrf";

export async function GET(req:NextRequest){
  const user=await apiUser(req);if(!user)return unauthorized();
  const posts=await db.post.findMany({select:{id:true,title:true,slug:true,status:true,updatedAt:true,revision:true},orderBy:{updatedAt:"desc"}});
  return NextResponse.json({posts},{headers:{"Cache-Control":"no-store"}});
}
export async function POST(req:NextRequest){
  if(!verifyWrite(req))return forbidden();
  const user=await apiUser(req);if(!user)return unauthorized();
  if(Number(req.headers.get("content-length")||0)>550_000)return badRequest("Payload too large",413);
  const parsed=articleInput.safeParse(await req.json().catch(()=>null));if(!parsed.success)return badRequest("Invalid article data");
  const input=parsed.data;
  const exists=await db.post.findUnique({where:{slug:input.slug},select:{id:true}});
  if(exists)return badRequest("Slug already exists",409);
  const publishedAt=input.status==="PUBLISHED"?new Date():null;
  const post=await db.post.create({data:{
    slug:input.slug,title:input.title,summary:input.summary,markdown:input.markdown,
    tags:JSON.stringify(input.tags),featured:input.featured,status:input.status,publishedAt,authorId:user.id,
    revisions:{create:{revision:1,title:input.title,summary:input.summary,markdown:input.markdown,tags:JSON.stringify(input.tags),status:input.status,editorId:user.id}},
  }});
  if(input.status==="PUBLISHED")await publishMedia(input.markdown);
  return NextResponse.json({post:{id:post.id,slug:post.slug,revision:post.revision}},{status:201,headers:{"Cache-Control":"no-store"}});
}
