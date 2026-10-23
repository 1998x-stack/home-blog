import { NextRequest, NextResponse } from "next/server";
import { searchPublishedPosts } from "@/lib/search/fts";

export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (q.length > 100) return NextResponse.json({ error: "Query too long" }, {status:400});
  const results = await searchPublishedPosts(q);
  return NextResponse.json({ results }, {
    headers:{"Cache-Control":"no-store", "X-Content-Type-Options":"nosniff"},
  });
}
