import {redirect} from "next/navigation";
import {getUser} from "@/lib/session";
import {LoginForm} from "@/components/admin/login-form";
export default async function Login(){if(await getUser())redirect("/admin/");return <section className="container page-section admin-box"><span className="eyebrow">CONTENT MANAGEMENT</span><h1>管理后台登录</h1><LoginForm/></section>;}
