import type { Metadata, Viewport } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { canonical, site } from "@/config/site";
import {PageViewTracker} from "@/components/analytics/page-view";
import "./globals.css";

export const dynamic = "force-dynamic";
export const viewport: Viewport = {width: "device-width", initialScale: 1, colorScheme: "light dark"};
export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {default: `${site.name} · Home Blog`, template: `%s | ${site.name}`},
  description: site.description,
  applicationName: site.title,
  alternates: {canonical: canonical("/"), types: {"application/rss+xml": canonical("/feed.xml")}},
  openGraph: {type: "website", siteName: site.name, title: site.title, description: site.description, locale: site.locale, url: site.url, images: [{url: "/og.svg", width: 1200, height: 630, alt: "Home Blog"}]},
  twitter: {card: "summary_large_image", images: ["/og.svg"]},
  robots: site.url.includes("localhost") ? {index:false, follow:false} : {index:true, follow:true},
};

export default function RootLayout({children}: Readonly<{children:React.ReactNode}>) {
  return <html lang={site.language} suppressHydrationWarning>
    <body><PageViewTracker/><a href="#main-content" className="skip-link">跳转到主要内容</a><div className="shell"><SiteHeader/><main id="main-content">{children}</main><SiteFooter/></div></body>
  </html>;
}
