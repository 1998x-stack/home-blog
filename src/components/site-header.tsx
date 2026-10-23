import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

const links = [
  {href:"/articles/", label:"文章"},
  {href:"/tags/", label:"标签"},
  {href:"/projects/", label:"项目"},
  {href:"/about/", label:"关于"},
];

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link href="/" className="brand" aria-label="Home Blog 首页"><span className="brand-mark">H.</span><span>HOME <em>BLOG</em></span></Link>
        <nav aria-label="主导航" className="main-nav">
          {links.map((item) => <Link href={item.href} key={item.href}>{item.label}</Link>)}
        </nav>
        <div className="header-actions">
          <Link className="search-link" href="/search/" aria-label="搜索文章">⌕ <span>搜索</span></Link>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
