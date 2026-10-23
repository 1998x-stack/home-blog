import Link from "next/link";
import { site } from "@/config/site";
export function SiteFooter() {
  return <footer className="site-footer v5-site-footer">
    <div className="container v5-footer-top"><div><span className="v5-overline">AN OPEN NOTEBOOK</span><h2>愿每次阅读，都能带来一点新的好奇。</h2></div><Link href="/articles/" className="v5-text-link">继续探索 <span aria-hidden="true">↗</span></Link></div>
    <div className="v5-river" aria-hidden="true"><svg viewBox="0 0 1200 66" preserveAspectRatio="none"><path d="M0 34Q90 8 180 34T360 34T540 34T720 34T900 34T1080 34T1260 34"/><path d="M0 47Q90 21 180 47T360 47T540 47T720 47T900 47T1080 47T1260 47"/></svg></div>
    <div className="container footer-inner"><div><strong>1998x · JOURNAL</strong><p>慢慢思考，认真写作，持续构建。</p></div><div className="footer-links"><Link href="/feed.xml">RSS</Link><Link href="/sitemap.xml">Sitemap</Link><a href={site.repo} target="_blank" rel="noopener noreferrer">Source ↗</a></div><span className="footer-copy">© {new Date().getUTCFullYear()} {site.author} · 让知识自由生长</span></div>
  </footer>;
}
