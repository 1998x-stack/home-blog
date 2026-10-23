import type {Metadata} from "next";
import {SearchClient} from "@/components/search-client";
import {canonical} from "@/config/site";
export const metadata:Metadata={title:"搜索文章",alternates:{canonical:canonical("/search/")},robots:{index:false,follow:true}};
export default function SearchPage(){return <section className="container page-section"><div className="page-intro"><span className="eyebrow">FIND SOMETHING USEFUL</span><h1>搜索知识<span className="title-period">.</span></h1><p>SQLite FTS5 提供中文子串检索；只搜索已发布文章，关键词不保存。</p></div><SearchClient/></section>}
