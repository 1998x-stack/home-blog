import {requireUser} from "@/lib/session";
import {AdminNav} from "@/components/admin/admin-nav";
import {PostEditor} from "@/components/admin/post-editor";
export default async function NewPost(){const user=await requireUser();return <section className="container page-section"><span className="eyebrow">NEW POST</span><h1>撰写文章</h1><AdminNav role={user.role}/><PostEditor/></section>;}
