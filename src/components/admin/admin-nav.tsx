import Link from "next/link";
import {LogoutButton} from "@/components/admin/logout-button";
export function AdminNav({role}:{role:string}){return <nav className="admin-nav" aria-label="后台导航"><Link href="/admin/">控制台</Link><Link href="/admin/posts/new/">写文章</Link><Link href="/admin/media/">媒体库</Link><Link href="/admin/analytics/">访问统计</Link>{role==="ADMIN"&&<Link href="/admin/users/">用户</Link>}<LogoutButton/></nav>;}
