import "dotenv/config";
import {PrismaBetterSqlite3} from "@prisma/adapter-better-sqlite3";
import {PrismaClient} from "../src/generated/prisma/client";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import {articleInput} from "../src/lib/validation";

async function main(){
 if(!process.env.DATABASE_URL)throw Error("DATABASE_URL required");
 const db=new PrismaClient({adapter:new PrismaBetterSqlite3({url:process.env.DATABASE_URL})});
 try{
  const admin=await db.user.findFirst({where:{role:"ADMIN"}});if(!admin)throw Error("Bootstrap admin first");
  const dir=path.join(process.cwd(),"content/posts");
  let created=0;
  for(const name of fs.readdirSync(dir).filter(x=>x.endsWith(".md"))){
    const slug=name.slice(0,-3);const {data,content}=matter(fs.readFileSync(path.join(dir,name),"utf-8"));
    const item=articleInput.parse({slug,title:data.title,summary:data.summary,markdown:content,tags:data.tags,featured:data.featured??false,status:data.draft?"DRAFT":"PUBLISHED"});
    const exists=await db.post.findUnique({where:{slug}});if(exists)continue;
    const publishedAt=item.status==="PUBLISHED"?new Date(`${data.date}T00:00:00.000Z`):null;
    await db.post.create({data:{slug:item.slug,title:item.title,summary:item.summary,markdown:item.markdown,tags:JSON.stringify(item.tags),featured:item.featured,status:item.status,publishedAt,authorId:admin.id,revisions:{create:{revision:1,title:item.title,summary:item.summary,markdown:item.markdown,tags:JSON.stringify(item.tags),status:item.status,editorId:admin.id}}}});
    created++;
  }
  console.log(`Imported ${created} posts; existing slugs unchanged.`);
 }finally{await db.$disconnect();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
