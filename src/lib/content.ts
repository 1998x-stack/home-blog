import "server-only";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { z } from "zod";
import { isTagSlug, tagLabels, type TagSlug } from "@/config/tags";

const postSchema = z.object({
  title: z.string().min(3),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((date) => !Number.isNaN(Date.parse(date)), "Invalid date"),
  updated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  summary: z.string().min(10).max(240),
  tags: z.array(z.string().refine(isTagSlug, "Unknown tag")).min(1),
  draft: z.boolean().default(false),
  featured: z.boolean().default(false),
});

export type Post = {
  slug: string;
  title: string;
  date: string;
  updated?: string;
  summary: string;
  tags: TagSlug[];
  featured: boolean;
  body: string;
  readingMinutes: number;
};

const postDir = path.join(process.cwd(), "content", "posts");

function readingMinutes(content: string): number {
  const han = (content.match(/[\u3400-\u9fff]/g) || []).length;
  const words = (content.replace(/[\u3400-\u9fff]/g, " ").match(/[\p{L}\p{N}]+/gu) || []).length;
  return Math.max(1, Math.ceil(han / 400 + words / 220));
}

export function getPosts(): Post[] {
  if (!fs.existsSync(postDir)) return [];
  return fs.readdirSync(postDir)
    .filter((file) => file.endsWith(".md"))
    .map((file) => {
      const slug = file.slice(0, -3);
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
        throw new Error(`Invalid post slug: ${slug}. Use lowercase kebab-case.`);
      }
      const { data, content } = matter(fs.readFileSync(path.join(postDir, file), "utf8"));
      const parsed = postSchema.safeParse(data);
      if (!parsed.success) {
        throw new Error(`Invalid frontmatter in ${file}: ${parsed.error.message}`);
      }
      if (parsed.data.draft) return null;
      return {
        slug,
        ...parsed.data,
        tags: parsed.data.tags as TagSlug[],
        body: content,
        readingMinutes: readingMinutes(content),
      } satisfies Post;
    })
    .filter((post): post is NonNullable<typeof post> => post !== null)
    .sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
}

export function getPost(slug: string) {
  return getPosts().find((post) => post.slug === slug);
}

export function getActiveTags() {
  const posts = getPosts();
  return (Object.entries(tagLabels) as [TagSlug, string][])
    .map(([slug, label]) => ({
      slug,
      label,
      count: posts.filter((post) => post.tags.includes(slug)).length,
    }))
    .filter((tag) => tag.count > 0);
}
