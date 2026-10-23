"use client";
import { useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";

type SearchPost = {slug:string; title:string; summary:string; date:string; tags:string[]; searchable:string};
export function SearchClient({posts}: {posts:SearchPost[]}) {
  const [query,setQuery] = useState("");
  const deferred = useDeferredValue(query);
  const results = useMemo(() => {
    const terms = deferred.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return posts;
    return posts.filter((post) => terms.every((term) => post.searchable.includes(term)));
  }, [posts,deferred]);
  return <section className="search-panel">
    <label className="input-label" htmlFor="article-search">搜索标题、摘要、标签和文章正文</label>
    <input id="article-search" className="search-input" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="试试 Next.js、部署、架构…" autoComplete="off" />
    <p className="result-count" role="status">找到 {results.length} 篇文章</p>
    <div className="search-results">{results.map((post) => <Link href={`/articles/${post.slug}/`} key={post.slug} className="search-result"><span className="eyebrow">{post.date}</span><strong>{post.title}</strong><span>{post.summary}</span><span className="article-arrow">阅读文章 ↗</span></Link>)}</div>
    {results.length === 0 && <p className="empty-state">没有找到匹配文章，试试更短的关键词。</p>}
  </section>;
}
