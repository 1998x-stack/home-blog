import Link from "next/link";
import {requireUser} from "@/lib/session";
import {db} from "@/lib/prisma";
import {AdminNav} from "@/components/admin/admin-nav";
export default async function Admin(){
 const user=await requireUser();
 const posts=await db.post.findMany({orderBy:{updatedAt:"desc"},select:{id:true,title:true,slug:true,status:true,revision:true,updatedAt:true}});
 return <section className="container page-section"><div className="page-intro"><span className="eyebrow">DASHBOARD / {user.displayName}</span><h1>内容管理<span className="title-period">.</span></h1><p>草稿与已发布文章都由 SQLite 持久化，改动保存到版本历史。</p></div><AdminNav role={user.role}/><div className="admin-heading"><h2>文章 ({posts.length})</h2><Link href="/admin/posts/new/" className="button-primary">新增文章 ↗</Link></div><div className="admin-list">{posts.map(post=><Link key={post.id} href={`/admin/posts/${post.id}/`} className="admin-post"><strong>{post.title}</strong><small>{post.status==="PUBLISHED"?"已发布":"草稿"} · v{post.revision} · {post.updatedAt.toLocaleDateString("zh-CN")}</small><span>编辑 →</span></Link>)}{posts.length===0&&<p>暂时没有文章。</p>}</div></section>;
}
