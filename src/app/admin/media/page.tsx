import {requireUser} from "@/lib/session";
import {AdminNav} from "@/components/admin/admin-nav";
import {MediaManager} from "@/components/admin/media-manager";
export default async function Media(){const user=await requireUser();return <section className="container page-section"><span className="eyebrow">MEDIA LIBRARY</span><h1>媒体库</h1><AdminNav role={user.role}/><MediaManager/></section>;}
