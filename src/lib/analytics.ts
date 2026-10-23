import "server-only";
import { db } from "@/lib/prisma";

// Canonical aggregation keys: no query strings, fragment identifiers, IPs or user IDs.
const fixedPages = new Set(["/", "/articles/", "/tags/", "/projects/", "/about/", "/search/"]);
export async function allowedPageKey(input: unknown): Promise<string|null> {
  if (typeof input !== "string" || input.length > 150 || !input.startsWith("/") || input.includes("?") || input.includes("#")) return null;
  const key = input.replace(/\/+/g,"/").replace(/(?<!^)\/$/,"") + (input === "/" ? "" : "/");
  if (fixedPages.has(key)) return key;
  const article=key.match(/^\/articles\/([a-z0-9]+(?:-[a-z0-9]+)*)\/$/);
  if(article) {
    const exists = await db.post.findFirst({where:{slug:article[1],status:"PUBLISHED",publishedAt:{lte:new Date()}},select:{id:true}});
    return exists ? key : null;
  }
  const tag=key.match(/^\/tags\/([a-z0-9-]+)\/$/);
  if (tag) {
    const {tagLabels}=await import("@/config/tags");
    return Object.hasOwn(tagLabels,tag[1]) ? key : null;
  }
  return null;
}

export async function recordPageView(pageKey:string) {
  const day = new Date().toISOString().slice(0,10);
  await db.pageViewDaily.upsert({
    where: {day_pageKey:{day,pageKey}},
    create: {day,pageKey,views:1},
    update: {views:{increment:1}},
  });
}
