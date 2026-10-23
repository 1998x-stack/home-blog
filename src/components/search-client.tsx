"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type SearchPost = {slug:string;title:string;summary:string;date:string;tags:string[]};
export function SearchClient() {
  const [query,setQuery] = useState("");
  const [posts,setPosts] = useState<SearchPost[]>([]);
  const [state,setState] = useState<"idle"|"loading"|"ready"|"error">("idle");
  useEffect(() => {
    const text = query.trim();
    if (!text) return;
    const controller = new AbortController();
    const handle = setTimeout(async () => {
      setState("loading");
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(text)}`, {signal:controller.signal,cache:"no-store"});
        if (!res.ok) throw Error("search failed");
        const data = await res.json() as {results:SearchPost[]};
        setPosts(data.results); setState("ready");
      } catch (error) {
        if (!controller.signal.aborted) { console.error(error); setState("error"); }
      }
    },250);
    return () => { clearTimeout(handle); controller.abort(); };
  },[query]);
  const active=query.trim().length>0;
  return <section className="search-panel">
    <label className="input-label" htmlFor="article-search">搜索已发布文章的标题、摘要和正文</label>
    <input id="article-search" className="search-input" type="search" value={query}
      onChange={e=>{setQuery(e.target.value);setPosts([]);setState("idle");}}
      placeholder="试试 Next.js、部署、架构…" autoComplete="off" maxLength={100}/>
    <p className="result-count" role="status">{!active?"输入关键词后开始搜索":state==="loading"||state==="idle"?"搜索中…":state==="error"?"搜索暂不可用，请稍后重试":`找到 ${posts.length} 篇文章`}</p>
    {active&&state==="ready"&&<div className="search-results">{posts.map(post=><Link href={`/articles/${post.slug}/`} key={post.slug} className="search-result"><span className="eyebrow">{post.date}</span><strong>{post.title}</strong><span>{post.summary}</span><span className="article-arrow">阅读文章 ↗</span></Link>)}</div>}
    {active&&state==="ready"&&posts.length===0&&<p className="empty-state">没有找到匹配文章，试试更短的关键词。</p>}
  </section>;
}
