import {requireAdmin} from "@/lib/session";
import {AdminNav} from "@/components/admin/admin-nav";
import {UserManager} from "@/components/admin/user-manager";
export default async function Users(){const user=await requireAdmin();return <section className="container page-section"><span className="eyebrow">ACCESS CONTROL</span><h1>管理用户</h1><AdminNav role={user.role}/><UserManager/></section>;}
