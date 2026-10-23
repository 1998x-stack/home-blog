import "server-only";
import { db } from "@/lib/prisma";
import { parseTags } from "@/lib/content";

export type SearchHit = {
  slug: string;
  title: string;
  summary: string;
  date: string;
  tags: string[];
};

type RankedRow = { postId: string; score: number };

/**
 * Trigram FTS5 supports 3+ unicode characters (including Chinese).
 * 1-2 char queries use a bounded SQL LIKE fallback. Never interpolate input
 * into SQL; quoted MATCH phrases are passed as bound parameters.
 */
export async function searchPublishedPosts(raw: string, limit = 20): Promise<SearchHit[]> {
  const query = raw.normalize("NFKC").trim().replace(/\s+/g, " ").slice(0, 80);
  if (!query) return [];
  const max = Math.min(Math.max(1, limit), 30);
  let ids: string[];
  if ([...query].length < 3) {
    const pattern = `%${query.replace(/[\\%_]/g, "\\$&")}%`;
    const result = await db.$queryRaw<{id:string}[]>`
      SELECT id FROM "Post" WHERE status = 'PUBLISHED' AND publishedAt IS NOT NULL
      AND (title LIKE ${pattern} ESCAPE '\\' OR summary LIKE ${pattern} ESCAPE '\\'
      OR markdown LIKE ${pattern} ESCAPE '\\') LIMIT 100`;
    ids = result.map(x => x.id);
  } else {
    const phrase = `"${query.replace(/"/g, '""')}"`;
    const result = await db.$queryRaw<RankedRow[]>`
      SELECT postId, bm25("PostFTS", 9.0, 4.0, 1.0) AS score
      FROM "PostFTS" WHERE "PostFTS" MATCH ${phrase}
      ORDER BY score LIMIT 150`;
    ids = result.map(x => x.postId);
  }
  if (!ids.length) return [];
  const rows = await db.post.findMany({
    where: { id: { in: ids }, status: "PUBLISHED", publishedAt: { lte: new Date() } },
    select: { id:true,slug:true,title:true,summary:true,tags:true,publishedAt:true },
  });
  const byId = new Map(rows.map(row => [row.id,row]));
  return ids.flatMap(id => {
    const row = byId.get(id);
    return row ? [{slug:row.slug,title:row.title,summary:row.summary,
      date:row.publishedAt!.toISOString().slice(0,10),tags:parseTags(row.tags)}] : [];
  }).slice(0,max);
}
