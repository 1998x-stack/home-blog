import { NextRequest,NextResponse } from "next/server";
import {db} from "@/lib/prisma";
import {apiUser} from "@/lib/api-auth";
import {articleInput} from "@/lib/validation";
import {verifyWrite,forbidden,badRequest,unauthorized} from "@/lib/csrf";
import {publishMedia} from "@/lib/publish-media";

export async function GET(req:NextRequest,{params}:{params:Promise<{id:string}>}){
  if(!await apiUser(req))return unauthorized();
  const {id}=await params;
  const post=await db.post.findUnique({where:{id},include:{revisions:{orderBy:{revision:"desc"},select:{id:true,revision:true,createdAt:true,status:true,editor:{select:{displayName:true}}}}}});
  if(!post)return badRequest("Post not found",404);
  return NextResponse.json({post:{...post,tags:JSON.parse(post.tags)}},{headers:{"Cache-Control":"no-store"}});
}
export async function PUT(req:NextRequest,{params}:{params:Promise<{id:string}>}){
  if(!verifyWrite(req))return forbidden();
  const user=await apiUser(req);if(!user)return unauthorized();
  if(Number(req.headers.get("content-length")||0)>550_000)return badRequest("Payload too large",413);
  const parsed=articleInput.safeParse(await req.json().catch(()=>null));if(!parsed.success||!parsed.data.revision)return badRequest("Invalid article/revision");
  const {id}=await params;const input=parsed.data;
  try {
    const post=await db.$transaction(async tx=>{
      const existing=await tx.post.findUnique({where:{id}});
      if(!existing)throw new Error("NOT_FOUND");
      if(existing.revision!==input.revision)throw new Error("CONFLICT");
      const clash=await tx.post.findFirst({where:{slug:input.slug,NOT:{id}},select:{id:true}});
      if(clash)throw new Error("SLUG_EXISTS");
      const data={slug:input.slug,title:input.title,summary:input.summary,markdown:input.markdown,tags:JSON.stringify(input.tags),featured:input.featured,status:input.status,publishedAt:input.status==="PUBLISHED"?(existing.publishedAt??new Date()):null};
      const updated=await tx.post.updateMany({where:{id,revision:input.revision},data:{...data,revision:{increment:1}}});
      if(updated.count!==1)throw new Error("CONFLICT");
      await tx.postRevision.create({data:{postId:id,revision:input.revision+1,title:input.title,summary:input.summary,markdown:input.markdown,tags:JSON.stringify(input.tags),status:input.status,editorId:user.id}});
      return {id,slug:input.slug,revision:input.revision+1};
    });
    if(input.status==="PUBLISHED")await publishMedia(input.markdown);
    return NextResponse.json({post},{headers:{"Cache-Control":"no-store"}});
  }catch(error){
    const msg=error instanceof Error?error.message:"";
    if(msg==="CONFLICT"||msg==="SLUG_EXISTS")return badRequest(msg,409);
    if(msg==="NOT_FOUND")return badRequest(msg,404);
    throw error;
  }
}
