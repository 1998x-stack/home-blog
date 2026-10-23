export const dynamic = "force-dynamic";
import Link from "next/link";
import { getPosts, getActiveTags } from "@/lib/content";
import { ArticleCard } from "@/components/article-card";
import { ProjectCard } from "@/components/project-card";
import { EditorialMark } from "@/components/editorial-mark";
import { projects } from "@/data/projects";

export default async function HomePage() {
  const [posts, tags] = await Promise.all([getPosts(), getActiveTags()]);
  const featured = posts.find((post) => post.featured) ?? posts[0];
  const series = tags.slice(0, 4);
  return <div className="v5-home">
    <section className="container v5-hero" aria-labelledby="v5-hero-title">
      <div className="v5-eyebrow-line"><span>1998X / A PERSONAL JOURNAL</span><span>EST. 2026 · 线上持续更新</span></div>
      <div className="v5-hero-grid">
        <div>
          <span className="v5-overline"><span aria-hidden="true" className="v5-spark">✳</span> Ideas, crafted with care</span>
          <h1 id="v5-hero-title">写给好奇心的<br/><em>长期来信。</em></h1>
          <p className="v5-lead">在快速变化的技术世界里，保留一点慢下来的耐心。这里记录人工智能、系统工程、开源实践，以及那些值得反复思考的问题。</p>
          <div className="v5-hero-actions">
            <Link className="v5-button-primary" href="/articles/">开始阅读 <span aria-hidden="true">↗</span></Link>
            <Link className="v5-text-link" href="/about/">关于这个博客 <span aria-hidden="true">→</span></Link>
          </div>
        </div>
        <div className="v5-hero-art"><EditorialMark variant="garden"/><p>NOTES ON<br/>BUILDING &amp; THINKING</p></div>
      </div>
      <div className="v5-hero-footer"><span>一页一页，慢慢写。</span><span>{posts.length} 篇文章 <span aria-hidden="true">·</span> {tags.length} 个主题</span></div>
    </section>

    {featured && <section className="v5-feature-wrap" aria-labelledby="v5-feature-title"><div className="container v5-feature">
      <div className="v5-feature-aside"><EditorialMark variant="star"/><span>EDITOR&apos;S LETTER<br/>本期推荐</span></div>
      <div><span className="v5-overline">精选阅读 / SELECTED ESSAY</span><h2 id="v5-feature-title"><Link href={'/articles/' + featured.slug + '/'}>{featured.title}</Link></h2><p>{featured.summary}</p><Link className="v5-text-link" href={'/articles/' + featured.slug + '/'}>读这篇文章 <span aria-hidden="true">↗</span></Link></div>
    </div></section>}

    <section className="container v5-content-section" aria-labelledby="v5-recent-title">
      <div className="v5-section-header"><div><span className="v5-overline">FROM THE JOURNAL / 01</span><h2 id="v5-recent-title">最近写下的<span className="v5-ending-dot">。</span></h2><p>一些认真做过、想过、反复推敲过的事。</p></div><Link href="/articles/" className="v5-text-link">所有文章 <span aria-hidden="true">→</span></Link></div>
      <div className="article-list v5-article-list">{posts.slice(0, 6).map((post, index) => <ArticleCard key={post.slug} post={post} index={index + 1}/>)}</div>
      {posts.length === 0 && <p className="empty-state">第一篇文章正在准备中。</p>}
    </section>

    {series.length > 0 && <section className="v5-series-section" aria-labelledby="v5-series-title"><div className="container">
      <div className="v5-section-header"><div><span className="v5-overline">FOLLOW A THREAD / 02</span><h2 id="v5-series-title">循着主题，深入一点<span className="v5-ending-dot">。</span></h2><p>把零散的想法，整理成能继续生长的知识。</p></div><Link href="/tags/" className="v5-text-link">主题索引 <span aria-hidden="true">→</span></Link></div>
      <div className="v5-series-grid">{series.map((tag, i) => <Link href={'/tags/' + tag.slug + '/'} className="v5-series-card" key={tag.slug}>
        <span className="v5-series-num">{String(i+1).padStart(2,"0")} / COLLECTION</span>
        <EditorialMark variant={i % 2 === 0 ? "orbit" : "leaf"}/>
        <strong>{tag.label}</strong>
        <span className="v5-series-bottom">{tag.count} 篇文章 <span aria-hidden="true">↗</span></span>
      </Link>)}</div>
    </div></section>}

    <section className="container v5-content-section v5-projects" aria-labelledby="v5-projects-title">
      <div className="v5-section-header"><div><span className="v5-overline">MADE WITH CURIOSITY / 03</span><h2 id="v5-projects-title">在做的事情<span className="v5-ending-dot">。</span></h2><p>想法要经过代码与现实，才会变得清晰。</p></div><Link href="/projects/" className="v5-text-link">全部项目 <span aria-hidden="true">→</span></Link></div>
      <div className="project-grid">{projects.slice(0,2).map((project,index) => <ProjectCard key={project.name} project={project} index={index+1}/>)}</div>
    </section>
  </div>;
}
