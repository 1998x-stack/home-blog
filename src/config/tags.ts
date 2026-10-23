export const tagLabels = {
  "nextjs": "Next.js",
  "engineering": "工程实践",
  "architecture": "系统架构",
  "writing": "写作",
  "devops": "DevOps",
} as const;

export type TagSlug = keyof typeof tagLabels;

export function isTagSlug(value: string): value is TagSlug {
  return Object.prototype.hasOwnProperty.call(tagLabels, value);
}
