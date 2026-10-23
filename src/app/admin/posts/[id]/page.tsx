import {requireUser} from "@/lib/session";
import {db} from "@/lib/prisma";
import {notFound} from "next/navigation";
import {AdminNav} from "@/components/admin/admin-nav";
import {PostEditor} from "@/components/admin/post-editor";
export default async function EditPost({params}:{params:Promise<{id:string}>}){
 const user=await requireUser();const {id}=await params;
 const post=await db.post.findUnique({where:{id},include:{revisions:{orderBy:{revision:"desc"},select:{revision:true,createdAt:true,editor:{select:{displayName:true}}}}}});
 if(!post)notFound();
 return <section className="container page-section"><span className="eyebrow">EDIT / VERSION {post.revision}</span><h1>编辑文章</h1><AdminNav role={user.role}/><PostEditor id={post.id} initial={{slug:post.slug,title:post.title,summary:post.summary,markdown:post.markdown,tags:JSON.parse(post.tags),featured:post.featured,status:post.status,revision:post.revision}} revisions={post.revisions.map(x=>({revision:x.revision,when:x.createdAt.toISOString(),editor:x.editor.displayName}))}/></section>;
}
