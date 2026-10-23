export const dynamic = "force-dynamic";
import type {MetadataRoute} from "next";
import {getPosts,getActiveTags} from "@/lib/content";
import {canonical} from "@/config/site";
export default async function sitemap():Promise<MetadataRoute.Sitemap>{
  const staticPages=["/","/articles/","/tags/","/projects/","/about/"];
  return [
    ...staticPages.map(path=>({url:canonical(path),changeFrequency:"monthly" as const,priority:path==="/"?1:0.6})),
    ...(await getPosts()).map(post=>({url:canonical(`/articles/${post.slug}/`),lastModified:new Date(`${post.updated??post.date}T00:00:00Z`),changeFrequency:"monthly" as const,priority:0.8})),
    ...(await getActiveTags()).map(tag=>({url:canonical(`/tags/${tag.slug}/`),changeFrequency:"monthly" as const,priority:0.4})),
  ];
}
