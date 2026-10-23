export const dynamic = "force-dynamic";
import type {Metadata} from "next";
import {SearchClient} from "@/components/search-client";
import {getPosts} from "@/lib/content";
import {tagLabels} from "@/config/tags";
import {canonical} from "@/config/site";
export const metadata:Metadata={title:"搜索文章",alternates:{canonical:canonical("/search/")},robots:{index:false,follow:true}};
export default async function SearchPage(){const posts=(await getPosts()).map(p=>({slug:p.slug,title:p.title,summary:p.summary,date:p.date,tags:p.tags.map(t=>tagLabels[t]),searchable:[p.title,p.summary,p.tags.map(t=>tagLabels[t]).join(" "),p.body].join(" ").toLocaleLowerCase()}));return <section className="container page-section"><div className="page-intro"><span className="eyebrow">FIND SOMETHING USEFUL</span><h1>搜索知识<span className="title-period">.</span></h1><p>离线友好的本地浏览器检索，不上传搜索关键词。</p></div><SearchClient posts={posts}/></section>}
