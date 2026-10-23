import Link from "next/link";
import { getPosts } from "@/lib/content";
import { ArticleCard } from "@/components/article-card";
import { ProjectCard } from "@/components/project-card";
import { projects } from "@/data/projects";

export default function HomePage() {
  const posts = getPosts();
  const featured = posts.find((post) => post.featured) ?? posts[0];
  return <>
    <section className="hero container"><div className="hero-kicker"><span className="pulse"/> AN OPEN DIGITAL GARDEN <span className="hero-line"/></div>
      <h1>把好奇心，<br/><em>写成可复用的知识。</em></h1>
      <p className="hero-description">记录系统设计、AI 工程、开源项目与技术实验。<br/>不追逐信息噪声，只沉淀能够长期使用的思考。</p>
      <div className="hero-actions"><Link className="button-primary" href="/articles/">阅读文章 <span>↗</span></Link><Link className="button-text" href="/projects/">探索项目 <span>→</span></Link></div>
      <div className="hero-bottom"><span>BUILD · LEARN · DOCUMENT</span><span>SCROLL TO EXPLORE ↓</span></div>
    </section>
    {featured && <section className="feature-band"><div className="container feature-grid"><div className="feature-label"><span className="eyebrow">EDITOR'S PICK / 01</span><div className="feature-decoration" aria-hidden>✳</div></div><div><span className="eyebrow">精选文章</span><h2><Link href={`/articles/${featured.slug}/`}>{featured.title} ↗</Link></h2><p>{featured.summary}</p><Link href={`/articles/${featured.slug}/`} className="underlined-link">阅读全文 <span>→</span></Link></div></div></section>}
    <section className="container section-pad"><div className="section-heading"><div><span className="eyebrow">THE JOURNAL</span><h2>最近文章 <span className="heading-accent">/ Writing</span></h2></div><Link className="underlined-link" href="/articles/">查看全部 →</Link></div><div className="article-list">{posts.slice(0,4).map((post,index) => <ArticleCard key={post.slug} post={post} index={index+1}/>)}</div></section>
    <section className="projects-section"><div className="container section-pad"><div className="section-heading"><div><span className="eyebrow">THINGS I BUILD</span><h2>开源项目 <span className="heading-accent">/ Projects</span></h2></div><Link className="underlined-link" href="/projects/">全部项目 →</Link></div><div className="project-grid">{projects.slice(0,2).map((project,index) => <ProjectCard key={project.name} project={project} index={index+1}/>)}</div></div></section>
  </>;
}
