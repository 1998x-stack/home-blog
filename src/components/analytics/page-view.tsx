"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
/** No cookies, fingerprints, persistent identifiers or URL query tracking. */
export function PageViewTracker() {
  const path=usePathname();
  const previous=useRef<string|null>(null);
  useEffect(()=>{
    if (!path || path.startsWith("/admin") || path.startsWith("/api/") || path===previous.current || document.visibilityState!=="visible") return;
    previous.current=path;
    void fetch("/api/analytics/view/",{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({path}),credentials:"omit",keepalive:true,cache:"no-store",
    }).catch(()=>{/* Analytics must never affect the visitor experience. */});
  },[path]);
  return null;
}
