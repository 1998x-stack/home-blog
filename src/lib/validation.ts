import { z } from "zod";
import { isTagSlug } from "@/config/tags";

export const slugRule = z.string().min(2).max(90).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const articleInput = z.object({
  slug: slugRule,
  title: z.string().trim().min(3).max(160),
  summary: z.string().trim().min(10).max(300),
  markdown: z.string().min(1).max(500_000),
  tags: z.array(z.string().refine(isTagSlug)).min(1).max(5),
  featured: z.boolean().default(false),
  status: z.enum(["DRAFT", "PUBLISHED"]),
  revision: z.number().int().positive().optional(),
});

export const loginInput = z.object({
  email: z.string().email().max(254).transform(v => v.trim().toLowerCase()),
  password: z.string().min(1).max(256),
});

export const userInput = z.object({
  email: z.string().email().max(254).transform(v => v.trim().toLowerCase()),
  displayName: z.string().trim().min(2).max(70),
  password: z.string().min(12).max(256),
  role: z.enum(["ADMIN", "EDITOR"]),
});
