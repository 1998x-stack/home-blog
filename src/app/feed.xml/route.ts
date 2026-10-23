import {getPosts} from "@/lib/content";
import {canonical,site} from "@/config/site";
export const dynamic="force-dynamic";
function xml(value:string){return value.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;");}
export async function GET(){
  const items=(await getPosts()).map(post=>`<item><title>${xml(post.title)}</title><link>${xml(canonical(`/articles/${post.slug}/`))}</link><guid isPermaLink="true">${xml(canonical(`/articles/${post.slug}/`))}</guid><pubDate>${new Date(`${post.date}T00:00:00Z`).toUTCString()}</pubDate><description>${xml(post.summary)}</description></item>`).join("");
  const document=`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${xml(site.title)}</title><link>${xml(site.url)}</link><description>${xml(site.description)}</description><language>${site.language}</language>${items}</channel></rss>`;
  return new Response(document,{headers:{"Content-Type":"application/rss+xml; charset=utf-8","Cache-Control":"public, max-age=300"}});
}
