export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import { ArticleCard } from "@/components/article-card";
import { getPosts } from "@/lib/content";
import { canonical } from "@/config/site";

export const metadata: Metadata = {title: "文章", description: "系统设计、技术实验与工程实践的完整文章目录。", alternates:{canonical:canonical("/articles/")}};
export default async function ArticlesPage() {
  const posts = await getPosts();
  return <section className="container page-section"><div className="page-intro"><span className="eyebrow">NOTES & ESSAYS / {String(posts.length).padStart(2,"0")}</span><h1>所有文章<span className="title-period">.</span></h1><p>从问题出发，记录过程，分享经过验证的思路。</p></div><div className="article-list">{posts.map((post,index)=><ArticleCard key={post.slug} post={post} index={index+1}/>)}</div>{posts.length===0 && <p className="empty-state">暂无已发布文章。</p>}</section>;
}
