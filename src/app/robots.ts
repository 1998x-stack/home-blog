export const dynamic = "force-dynamic";
import type { MetadataRoute } from "next";
import { canonical, site } from "@/config/site";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: site.url.includes("localhost")
      ? { userAgent: "*", disallow: "/" }
      : { userAgent: "*", allow: "/", disallow: ["/admin/", "/api/"] },
    sitemap: canonical("/sitemap.xml"),
  };
}
