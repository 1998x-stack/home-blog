import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPost } from "@/lib/content";
import { markdownToHtml } from "@/lib/markdown";
import { tagLabels } from "@/config/tags";
import { formatDate } from "@/lib/format";
import { canonical, site } from "@/config/site";

export const dynamic = "force-dynamic";

export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata> {
  const {slug}=await params; const post=await getPost(slug); if(!post) return {title:"文章不存在"};
  const url=canonical(`/articles/${slug}/`);
  return {title:post.title,description:post.summary,alternates:{canonical:url},openGraph:{type:"article",title:post.title,description:post.summary,url,publishedTime:`${post.date}T00:00:00Z`,modifiedTime:`${post.updated??post.date}T00:00:00Z`,tags:post.tags.map(t=>tagLabels[t])}};
}
export default async function ArticlePage({params}:{params:Promise<{slug:string}>}) {
  const {slug}=await params;
  const post=await getPost(slug); if(!post) notFound();
  const html=await markdownToHtml(post.body);
  const jsonLd={"@context":"https://schema.org","@type":"BlogPosting",headline:post.title,description:post.summary,datePublished:post.date,dateModified:post.updated??post.date,author:{"@type":"Person",name:site.author},mainEntityOfPage:canonical(`/articles/${post.slug}/`)};
  return <article className="container post-layout"><div className="post-back"><Link href="/articles/">← 返回文章列表</Link></div><header className="post-header"><div className="eyebrow">FIELD NOTES / {formatDate(post.date)}</div><h1>{post.title}</h1><p>{post.summary}</p><div className="post-meta"><span>{post.readingMinutes} 分钟阅读</span><span>·</span>{post.updated && <span>更新：{formatDate(post.updated)}</span>}{post.tags.map(tag=><Link href={`/tags/${tag}/`} key={tag} className="chip">{tagLabels[tag]}</Link>)}</div></header>
    <div className="post-content prose" dangerouslySetInnerHTML={{__html:html}}/>
    <footer className="post-end"><div className="end-symbol">✳</div><p>感谢阅读。好的技术文章值得反复修改。</p><Link href="/articles/" className="underlined-link">继续阅读其他文章 →</Link></footer>
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(jsonLd).replace(/</g,"\u003c")}}/>
  </article>;
}
