#!/usr/bin/env node
/** Offline public-only site export. No sessions, drafts, admin routes or DB copied. */
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, statSync, lstatSync, writeFileSync} from 'node:fs';
import {dirname,join,resolve,basename,relative,sep} from 'node:path';
import {unified} from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeSlug from 'rehype-slug';
import rehypeSanitize from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';

const dbUrl=process.env.DATABASE_URL??'';
if(!dbUrl.startsWith('file:'))throw Error('DATABASE_URL must be a file: SQLite URL');
const dbPath=resolve(dbUrl.slice(5));
const mediaDir=resolve(process.env.MEDIA_DIR??'/data/uploads');
const destination=resolve(process.env.PUBLIC_EXPORT_DIR??'./dist-public');
const origin=(process.env.PUBLIC_SITE_URL??'').replace(/\/$/,'');
if(!origin || !/^https:\/\/[^/?#]+(?:\/[a-zA-Z0-9_-]+)*$/i.test(origin) && !(process.env.PUBLIC_EXPORT_ALLOW_HTTP==='YES' && /^http:\/\/[^/?#]+(?:\/[a-zA-Z0-9_-]+)*$/i.test(origin))) throw Error('PUBLIC_SITE_URL must be an HTTPS origin');
const basePath=new URL(origin).pathname.replace(/\/$/,'');
if(!existsSync(dbPath))throw Error('Source database missing');
if([dbPath,mediaDir,'/',dirname(dbPath)].includes(destination)||destination.startsWith(mediaDir+'/')||dbPath.startsWith(destination+'/')||mediaDir.startsWith(destination+'/'))throw Error('Refusing unsafe export path');
if(existsSync(destination) && !existsSync(join(destination,'.home-blog-static-export'))) throw Error('Refusing to replace directory without export marker');
mkdirSync(dirname(destination),{recursive:true});
const stage=mkdtempSync(join(dirname(destination),'.home-blog-export-'));
const esc=(s)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const xml=esc;
const slugSafe=s=>typeof s==='string'&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s);
const tagsMap={nextjs:'Next.js',engineering:'工程实践',architecture:'系统架构',writing:'写作',devops:'DevOps',llm:'大语言模型',research:'论文精读',alignment:'模型对齐'};
const sha=buf=>createHash('sha256').update(buf).digest('hex');
function output(path,contents){
  const full=join(stage,path);mkdirSync(dirname(full),{recursive:true});writeFileSync(full,contents,{mode:0o644});
}
function query(sql,db){
  const text=execFileSync('sqlite3',['-json',db,sql],{encoding:'utf8',maxBuffer:32*1024*1024});
  return text.trim()?JSON.parse(text):[];
}
function timestamp(value){
  if(value===null||value===undefined)return NaN;
  if(typeof value==='number')return value<1e11?value*1000:value;
  if(/^\d+$/.test(String(value)))return timestamp(Number(value));
  return Date.parse(String(value));
}
function href(path){return origin+path;}
function pathUrl(path){return basePath+path;}
function shell(title,body,description='技术文章与工程实践笔记'){
  const desc=esc(description).slice(0,600);
  const nav=[['/articles/','文章'],['/tags/','主题'],['/projects/','项目'],['/about/','关于']];
  const links=nav.map(([path,label])=>'<a href="'+pathUrl(path)+'">'+label+'</a>').join('');
  return '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#f8f7f2"><title>'+esc(title)+' · 1998x Journal</title><meta name="description" content="'+desc+'"><meta property="og:type" content="'+(currentPath.startsWith('/articles/')?'article':'website')+'"><meta property="og:title" content="'+esc(title)+'"><meta property="og:description" content="'+desc+'"><meta property="og:url" content="'+esc(href(currentPath))+'"><meta property="og:locale" content="zh_CN"><meta name="twitter:card" content="summary"><meta name="robots" content="'+(currentPath==='/search/'?'noindex,follow':'index,follow')+'"><link rel="canonical" href="'+esc(href(currentPath))+'"><link rel="stylesheet" href="'+pathUrl('/assets/site.css')+'"><link rel="alternate" type="application/rss+xml" href="'+pathUrl('/feed.xml')+'" title="1998x Journal"></head><body><a class="skip-link" href="#content">跳转到主要内容</a><header class="site-header"><nav class="pub-nav"><a class="brand" href="'+pathUrl('/')+'"><span class="brand-flower" aria-hidden="true">✳</span>1998x <i>journal</i></a><div class="nav-links">'+links+'</div><div class="nav-actions"><a href="'+pathUrl('/search/')+'" aria-label="搜索文章">⌕ <span>搜索</span></a><button type="button" id="theme-toggle" aria-label="切换深浅色模式">☾</button></div></nav></header><main id="content">'+body+'</main><footer class="site-footer"><div class="footer-intro"><p class="eyebrow">AN OPEN NOTEBOOK</p><h2>愿每次阅读，都带来一点新的好奇。</h2><a class="text-link" href="'+pathUrl('/articles/')+'">继续探索 ↗</a></div><div class="river" aria-hidden="true"><svg viewBox="0 0 1200 66" preserveAspectRatio="none"><path d="M0 34Q90 8 180 34T360 34T540 34T720 34T900 34T1080 34T1260 34"/><path d="M0 47Q90 21 180 47T360 47T540 47T720 47T900 47T1080 47T1260 47"/></svg></div><div class="footer-bottom"><div><strong>1998x · JOURNAL</strong><p>慢慢思考，认真写作，持续构建。</p></div><div class="footer-links"><a href="'+pathUrl('/feed.xml')+'">RSS</a><a href="'+pathUrl('/sitemap.xml')+'">Sitemap</a><a href="https://github.com/1998x-stack/home-blog" rel="noopener noreferrer">GitHub ↗</a></div></div></footer><script src="'+pathUrl('/assets/theme.js')+'" defer></script></body></html>';
}
let currentPath='/';
function page(path,title,body,description){currentPath=path;output(path==='/'?'index.html':path.slice(1)+'index.html',shell(title,body,description));}
function card(p,index){
  const tags=p.tags.map(t=>'<a href="'+pathUrl('/tags/'+t+'/')+'">'+esc(tagsMap[t])+'</a>').join('');
  return '<article class="card"><span class="card-index">'+String(index??1).padStart(2,'0')+'</span><div><p class="meta">'+esc(p.date)+' · 一篇技术笔记</p><h2><a href="'+pathUrl('/articles/'+p.slug+'/')+'">'+esc(p.title)+' <span aria-hidden="true">↗</span></a></h2><p>'+esc(p.summary)+'</p><div class="tags">'+tags+'</div></div></article>';
}
function dateOnly(ms){return new Date(ms).toISOString().slice(0,10);}
async function markdown(md){return String(await unified().use(remarkParse).use(remarkGfm).use(remarkRehype).use(rehypeSlug).use(rehypeSanitize).use(rehypeStringify).process(md));}
try {
  const snapshot=join(stage,'.read-snapshot.db');
  // Read a consistent SQLite snapshot; WAL transactions included. No live DB reads afterward.
  execFileSync('sqlite3',[dbPath,`.backup '${snapshot.replaceAll("'","''")}'`]);
  const raw=query(`SELECT slug,title,summary,markdown,tags,featured,status,publishedAt,updatedAt FROM Post`,snapshot);
  const now=Date.now();
  const records=raw.filter(x=>x.status==='PUBLISHED'&&slugSafe(x.slug)&&Number.isFinite(timestamp(x.publishedAt))&&timestamp(x.publishedAt)<=now)
    .map(x=>{let tags=[];try{tags=JSON.parse(x.tags||'[]').filter(t=>Object.hasOwn(tagsMap,t));}catch{};
      return {...x,tags,date:dateOnly(timestamp(x.publishedAt)),updated:dateOnly(Number.isFinite(timestamp(x.updatedAt))?timestamp(x.updatedAt):timestamp(x.publishedAt))};})
    .sort((a,b)=>timestamp(b.publishedAt)-timestamp(a.publishedAt)||a.slug.localeCompare(b.slug));
  const media=query(`SELECT id,storedName,mimeType,isPublic FROM Media WHERE isPublic=1`,snapshot);
  const mediaById=new Map(media.filter(m=>/^[a-z0-9]{20,50}$/.test(m.id)&&/^[a-f0-9-]{36}\.(jpg|png|webp)$/.test(m.storedName))
    .map(m=>[m.id,m]));
  rmSync(snapshot);
  const copied=new Set();
  function replaceMedia(md){return md.replace(/\/media\/([a-z0-9]{20,50})(?![a-z0-9])/g,(match,id)=>{
    const record=mediaById.get(id);if(!record)return match;
    if(!existsSync(join(mediaDir,record.storedName)))return match;
    const ext=record.storedName.split('.').pop();
    if(!copied.has(id)){
      const src=join(mediaDir,record.storedName);
      if(!lstatSync(src).isFile())return match;
      // Only copy media that appears in a published article.
      mkdirSync(join(stage,'media'),{recursive:true});cpSync(src,join(stage,'media',id+'.'+ext),{dereference:false});copied.add(id);
    }
    return pathUrl(`/media/${id}.${ext}`);
  });}
  for(const p of records){
    const body=await markdown(replaceMedia(p.markdown));
    const data={"@context":"https://schema.org","@type":"BlogPosting",headline:p.title,description:p.summary,url:href(`/articles/${p.slug}/`),mainEntityOfPage:href(`/articles/${p.slug}/`),datePublished:`${p.date}T00:00:00+08:00`,dateModified:`${p.updated}T00:00:00+08:00`,inLanguage:"zh-CN",isAccessibleForFree:true,author:{"@type":"Person",name:"1998x Stack",url:href("/about/")},publisher:{"@type":"Organization",name:"1998x Stack",url:href("/")}};
    const schema=JSON.stringify(data).replace(/</g,"\\u003c");
    page(`/articles/${p.slug}/`,p.title,`<a class="back" href="${pathUrl('/articles/')}">← 文章</a><article><h1>${esc(p.title)}</h1><p class="meta">${esc(p.date)} · 更新 ${esc(p.updated)}</p><p>${esc(p.summary)}</p><div class="prose">${body}</div></article><script type="application/ld+json">${schema}</script>`,p.summary);
  }
  const feature=records.find(p=>p.featured)||records[0];
  const featured=feature?'<div class="feature"><aside><span class="flower">✳</span><span>EDITOR’S LETTER<br>本期推荐</span></aside><div><p class="eyebrow">精选阅读 / SELECTED ESSAY</p><h2><a href="'+pathUrl('/articles/'+feature.slug+'/')+'">'+esc(feature.title)+'</a></h2><p>'+esc(feature.summary)+'</p><a class="text-link" href="'+pathUrl('/articles/'+feature.slug+'/')+'">读这篇文章 ↗</a></div></div>':'';
  const counts=Object.keys(tagsMap).filter(t=>records.some(p=>p.tags.includes(t)));
  const topics=counts.slice(0,4).map((t,i)=>'<a class="topic" href="'+pathUrl('/tags/'+t+'/')+'"><span class="topic-index">0'+(i+1)+' / COLLECTION</span><span class="topic-icon" aria-hidden="true">'+(i%2?'❧':'✧')+'</span><strong>'+esc(tagsMap[t])+'</strong><span>'+records.filter(p=>p.tags.includes(t)).length+' 篇文章 ↗</span></a>').join('');
  const homepage='<div class="hero"><div class="eyebrow-rule">1998X / A PERSONAL JOURNAL <span>EST. 2026 · 线上持续更新</span></div><div class="hero-content"><div><span class="eyebrow">✳ IDEAS, CRAFTED WITH CARE</span><h1>写给好奇心的<br><em>长期来信。</em></h1><p>在快速变化的技术世界里，保留一点慢下来的耐心。这里记录人工智能、系统工程、开源实践，以及那些值得反复思考的问题。</p><div class="hero-actions"><a class="primary" href="'+pathUrl('/articles/')+'">开始阅读 ↗</a><a class="text-link" href="'+pathUrl('/about/')+'">关于这个博客 →</a></div></div><div class="botanical" aria-hidden="true">✳<small>NOTES ON BUILDING<br>& THINKING</small></div></div><div class="hero-bottom"><span>一页一页，慢慢写。</span><span>'+records.length+' 篇文章 · '+counts.length+' 个主题</span></div></div>'+featured+'<section class="journal"><div class="section-title"><div><p class="eyebrow">FROM THE JOURNAL / 01</p><h2>最近写下的<span>。</span></h2><p>一些认真做过、想过、反复推敲过的事。</p></div><a class="text-link" href="'+pathUrl('/articles/')+'">所有文章 →</a></div><div class="articles">'+records.slice(0,6).map((p,i)=>card(p,i+1)).join('')+'</div></section>'+(topics?'<section class="collections"><div class="section-title"><div><p class="eyebrow">FOLLOW A THREAD / 02</p><h2>循着主题，深入一点<span>。</span></h2><p>把零散的想法，整理成能继续生长的知识。</p></div><a class="text-link" href="'+pathUrl('/tags/')+'">主题索引 →</a></div><div class="topic-grid">'+topics+'</div></section>':'');
  page('/','1998x Journal',homepage);
  page('/articles/','全部文章','<div class="page-heading"><p class="eyebrow">NOTES & ESSAYS</p><h1>所有文章。</h1><p>'+records.length+' 篇已发布文章，记录一些值得细读的事。</p></div><div class="articles">'+records.map((p,i)=>card(p,i+1)).join('')+'</div>');
  const active=Object.keys(tagsMap).filter(t=>records.some(p=>p.tags.includes(t)));
  page('/tags/','文章主题','<div class="page-heading"><p class="eyebrow">FOLLOW A THREAD</p><h1>主题索引。</h1><p>按照兴趣和问题，把阅读串成自己的路径。</p></div><div class="tags">'+active.map(t=>'<a href="'+pathUrl('/tags/'+t+'/')+'">'+esc(tagsMap[t])+'</a>').join('')+'</div>');
  for(const t of active)page(`/tags/${t}/`,tagsMap[t],`<h1>${esc(tagsMap[t])}</h1>${records.filter(p=>p.tags.includes(t)).map(card).join('')}`);
  const projects=JSON.parse(readFileSync(new URL('./projects.json',import.meta.url),'utf8'));
  page('/projects/','开源项目',`<h1>开源项目</h1>${projects.filter(p=>/^https:\/\/github\.com\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+$/.test(p.href)).map(p=>`<article class="card"><p class="meta">${esc(p.category)}</p><h2><a href="${esc(p.href)}" rel="noopener noreferrer">${esc(p.name)}</a></h2><p>${esc(p.description)}</p></article>`).join('')}`);
  page('/about/','关于本站','<h1>关于本站</h1><p>这里记录软件工程、系统架构、分布式技术与长期实践。</p><p>博客由家用 Ubuntu 维护，公开页面以经过校验的只读快照发布。</p>');
  page('/search/','搜索文章','<h1>搜索公开文章</h1><label for="q">关键词</label><input id="q" type="search" maxlength="80" autocomplete="off" placeholder="搜索文章标题、摘要、正文"><div id="results" aria-live="polite"></div><script src="'+pathUrl('/assets/search.js')+'" defer></script>');
  const index=records.map(({slug,title,summary,markdown:body,tags,date})=>({slug,title,summary,tags,date,text:body.replace(/\/media\/[a-z0-9]{20,50}/g,'[media]').replace(/[`*_#[\]()!>~-]/g,' ').slice(0,10000)}));
  output('search-index.json',JSON.stringify(index));
  output('feed.xml',`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Home Blog</title><link>${xml(origin)}</link><description>技术与工程实践文章</description>${records.slice(0,40).map(p=>`<item><title>${xml(p.title)}</title><link>${xml(href(`/articles/${p.slug}/`))}</link><guid>${xml(href(`/articles/${p.slug}/`))}</guid><pubDate>${new Date(timestamp(p.publishedAt)).toUTCString()}</pubDate><description>${xml(p.summary)}</description></item>`).join('')}</channel></rss>`);
  const urls=['/','/articles/','/tags/','/search/','/about/','/projects/',...active.map(t=>`/tags/${t}/`),...records.map(p=>`/articles/${p.slug}/`)];
  output('sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(u=>`<url><loc>${xml(href(u))}</loc></url>`).join('')}</urlset>`);
  output('robots.txt',`User-agent: *\nAllow: ${pathUrl('/')}\nSitemap: ${href('/sitemap.xml')}\n`);
  output('llms.txt',`# 1998x Stack — 中文技术论文精读\n\n> 原创技术解读、工程分析与原论文引用。目录为辅助阅读，不保证被任何 AI 搜索引擎采用。\n\n## Articles\n\n${records.map(p=>`- [${p.title}](${href(`/articles/${p.slug}/`)}) — ${p.summary}`).join('\n')}\n`);
  output('healthz','ok\n');
  // These assets are audited, static and loaded exclusively from the same origin.
  mkdirSync(join(stage,'assets'),{recursive:true});
  for(const filename of ['site.css','search.js','theme.js'])cpSync(new URL(`./assets/${filename}`,import.meta.url),join(stage,'assets',filename));
  output('.home-blog-static-export','home-blog-public-v5\n');
  const files=[];function walk(dir){for(const e of readdirSync(dir,{withFileTypes:true})){
    const file=join(dir,e.name);if(e.isDirectory())walk(file);else if(e.isFile()){
      const rel=relative(stage,file).split(sep).join('/');files.push({path:rel,bytes:statSync(file).size,sha256:sha(readFileSync(file))});
    }else throw Error('Unexpected exported file type');}}
  walk(stage);files.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
  const digest=sha(JSON.stringify(files));
  output('release-manifest.json',JSON.stringify({schema:1,version:'5.0.0',origin,posts:records.length,media:copied.size,digest,files},null,2)+'\n');
  if(existsSync(destination))rmSync(destination,{recursive:true,force:true});
  renameSync(stage,destination);
  console.log(JSON.stringify({destination,posts:records.length,media:copied.size,digest,files:files.length}));
}catch(e){rmSync(stage,{recursive:true,force:true});throw e;}
