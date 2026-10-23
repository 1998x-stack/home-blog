import {NextRequest,NextResponse} from "next/server";
import {db} from "@/lib/prisma";
import {apiUser} from "@/lib/api-auth";
import {verifyWrite,forbidden,badRequest,unauthorized} from "@/lib/csrf";
import {publishMedia} from "@/lib/publish-media";

export async function POST(req:NextRequest,{params}:{params:Promise<{id:string}>}){
  if(!verifyWrite(req))return forbidden();
  const user=await apiUser(req);if(!user)return unauthorized();
  const {id}=await params;
  const input=await req.json().catch(()=>null) as {revision?:unknown}|null;
  if(!input||typeof input.revision!=="number"||!Number.isInteger(input.revision))return badRequest("Invalid revision");
  try{
    const result=await db.$transaction(async tx=>{
      const [post,version]=await Promise.all([tx.post.findUnique({where:{id}}),tx.postRevision.findUnique({where:{postId_revision:{postId:id,revision:input.revision as number}}})]);
      if(!post||!version)throw new Error("NOT_FOUND");
      const n=post.revision+1;
      await tx.post.update({where:{id},data:{title:version.title,summary:version.summary,markdown:version.markdown,tags:version.tags,status:version.status,publishedAt:version.status==="PUBLISHED"?(post.publishedAt??new Date()):null,revision:n}});
      await tx.postRevision.create({data:{postId:id,revision:n,title:version.title,summary:version.summary,markdown:version.markdown,tags:version.tags,status:version.status,editorId:user.id}});
      return {revision:n,markdown:version.markdown,status:version.status};
    });
    if(result.status==="PUBLISHED")await publishMedia(result.markdown);
    return NextResponse.json({revision:result.revision},{headers:{"Cache-Control":"no-store"}});
  }catch(error){if(error instanceof Error && error.message==="NOT_FOUND")return badRequest("Not found",404);throw error;}
}
