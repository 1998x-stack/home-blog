import {db} from "@/lib/prisma";
export async function publishMedia(markdown:string){
  const ids=Array.from(markdown.matchAll(/\/media\/([a-z0-9]{20,40})/g),m=>m[1]);
  if(ids.length)await db.media.updateMany({where:{id:{in:ids}},data:{isPublic:true}});
}
