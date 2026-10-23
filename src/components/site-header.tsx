import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
const links = [{href:"/articles/",label:"文章"},{href:"/tags/",label:"主题"},{href:"/projects/",label:"项目"},{href:"/about/",label:"关于"}];
export function SiteHeader() {
  return <header className="site-header v5-site-header"><div className="container header-inner">
    <Link href="/" className="brand v5-brand" aria-label="1998x Stack 博客首页"><span className="v5-brand-symbol" aria-hidden="true">✳</span><span>1998x <em>journal</em></span></Link>
    <nav aria-label="主导航" className="main-nav">{links.map(link=><Link key={link.href} href={link.href}>{link.label}</Link>)}</nav>
    <div className="header-actions"><Link className="search-link" href="/search/" aria-label="搜索文章"><span aria-hidden="true">⌕</span><span>搜索</span></Link><ThemeToggle/></div>
  </div></header>;
}
