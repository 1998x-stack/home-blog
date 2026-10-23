import type {Metadata} from "next";
import Link from "next/link";
import {notFound} from "next/navigation";
import {getActiveTags,getPosts} from "@/lib/content";
import {tagLabels,isTagSlug} from "@/config/tags";
import {ArticleCard} from "@/components/article-card";
import {canonical} from "@/config/site";
export const dynamic="force-dynamic";
export async function generateMetadata({params}:{params:Promise<{tag:string}>}):Promise<Metadata>{const {tag}=await params;return {title:isTagSlug(tag)?`标签：${tagLabels[tag]}`:"未知标签",alternates:{canonical:canonical(`/tags/${tag}/`)}};}
export default async function TagPage({params}:{params:Promise<{tag:string}>}){const {tag}=await params;if(!isTagSlug(tag)||!(await getActiveTags()).some(t=>t.slug===tag))notFound();const posts=(await getPosts()).filter(post=>post.tags.includes(tag));return <section className="container page-section"><div className="page-intro"><Link href="/tags/" className="back-link">← 所有主题</Link><span className="eyebrow">TOPIC / {tag.toUpperCase()}</span><h1>{tagLabels[tag]}<span className="title-period">.</span></h1><p>共 {posts.length} 篇相关文章。</p></div><div className="article-list">{posts.map((post,index)=><ArticleCard post={post} index={index+1} key={post.slug}/>)}</div></section>}
