import Link from "next/link";
import { site } from "@/config/site";

export function SiteFooter() {
  return <footer className="site-footer"><div className="container footer-inner">
    <div><strong>HOME BLOG</strong><p>认真记录，持续构建。</p></div>
    <div className="footer-links">
      <Link href="/feed.xml">RSS</Link>
      <Link href="/sitemap.xml">Sitemap</Link>
      <a href={site.repo} target="_blank" rel="noopener noreferrer">Source ↗</a>
    </div>
    <span className="footer-copy">© {new Date().getUTCFullYear()} {site.author}</span>
  </div></footer>;
}
