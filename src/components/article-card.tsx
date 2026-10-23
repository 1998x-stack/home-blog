import Link from "next/link";
import type { Post } from "@/lib/content";
import { tagLabels } from "@/config/tags";
import { formatDate } from "@/lib/format";

export function ArticleCard({post, index}: {post: Post, index?: number}) {
  return <article className="article-card">
    <div className="article-index">{String(index ?? 1).padStart(2, "0")}</div>
    <div className="article-card-main">
      <div className="meta"><time dateTime={post.date}>{formatDate(post.date)}</time><span className="meta-dot">·</span>{post.readingMinutes} 分钟阅读</div>
      <h3><Link href={`/articles/${post.slug}/`}>{post.title}<span className="article-arrow" aria-hidden>↗</span></Link></h3>
      <p>{post.summary}</p>
      <div className="tag-row">{post.tags.map((tag) => <Link key={tag} href={`/tags/${tag}/`} className="chip">{tagLabels[tag]}</Link>)}</div>
    </div>
  </article>;
}
