import "server-only";
import { db } from "@/lib/prisma";
import { tagLabels, type TagSlug } from "@/config/tags";
import type { Post as DbPost } from "@/generated/prisma/client";

export type Post={slug:string;title:string;date:string;updated?:string;summary:string;tags:TagSlug[];featured:boolean;body:string;readingMinutes:number};
export function readingMinutes(content:string):number {
  const han=(content.match(/[\u3400-\u9fff]/g)||[]).length;
  const words=(content.replace(/[\u3400-\u9fff]/g," ").match(/[\p{L}\p{N}]+/gu)||[]).length;
  return Math.max(1,Math.ceil(han/400+words/220));
}
export function parseTags(value:string):TagSlug[]{
  try {const obj:unknown=JSON.parse(value);return Array.isArray(obj)?obj.filter((x):x is TagSlug=>typeof x==="string" && Object.hasOwn(tagLabels,x)):[];}catch{return [];}
}
function display(row:DbPost):Post {
  return {slug:row.slug,title:row.title,date:(row.publishedAt??row.createdAt).toISOString().slice(0,10),updated:row.updatedAt.toISOString().slice(0,10),summary:row.summary,tags:parseTags(row.tags),featured:row.featured,body:row.markdown,readingMinutes:readingMinutes(row.markdown)};
}
export async function getPosts():Promise<Post[]> {
  const rows=await db.post.findMany({where:{status:"PUBLISHED",publishedAt:{lte:new Date()}},orderBy:[{publishedAt:"desc"},{slug:"asc"}]});
  return rows.map(display);
}
export async function getPost(slug:string){
  const row=await db.post.findUnique({where:{slug}});
  return row && row.status==="PUBLISHED" && row.publishedAt && row.publishedAt<=new Date()?display(row):undefined;
}
export async function getActiveTags(){
  const posts=await getPosts();
  return (Object.entries(tagLabels) as [TagSlug,string][]).map(([slug,label])=>({slug,label,count:posts.filter(p=>p.tags.includes(slug)).length})).filter(t=>t.count>0);
}
