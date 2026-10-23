import type { Metadata } from "next";
import Link from "next/link";
import { getActiveTags } from "@/lib/content";
import { canonical } from "@/config/site";
export const metadata: Metadata={title:"文章标签",alternates:{canonical:canonical("/tags/")}};
export default function TagsPage(){const tags=getActiveTags();return <section className="container page-section"><div className="page-intro"><span className="eyebrow">EXPLORE BY TOPIC</span><h1>主题索引<span className="title-period">.</span></h1><p>按照主题探索文章与实践记录。</p></div><div className="topic-grid">{tags.map(tag=><Link className="topic-card" key={tag.slug} href={`/tags/${tag.slug}/`}><span className="eyebrow">TOPIC / {tag.slug.toUpperCase()}</span><strong>{tag.label}</strong><span>{tag.count} 篇文章 ↗</span></Link>)}</div></section>}
