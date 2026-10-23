# V5 editorial design: independent visual language

## Reference and design boundary

The inspiration site is https://lastwhisper.dev/. Its emphasis on ample whitespace, long-form reading, topical series and small handcrafted details informed the *direction* of V5. We created new typography, colors, ornaments, layout, and copy; no reference site's assets, CSS, illustrations or article content are copied.

## Goals

1. The first viewport introduces a personal engineering journal, not a generic SaaS homepage.
2. Content hierarchy: welcome → featured essay → newest six articles → topical collections → engineering projects.
3. Both public rendering modes use warm paper, muted sage, serif headings, calm spacing and low-stimulation motion.
4. Long articles favor narrow measures and comfortable line height; links are distinguishable from body text.
5. V2/V3 management tools, roles, CSRF checks, database schema, search, audit and V4 public-export protections are retained.

## Design tokens

| Token | Light | Dark |
| --- | --- | --- |
| background | #f8f7f2 | #17211d |
| surface | #f0f1e9 | #202f27 |
| main text | #27322b | #f2f0e8 |
| secondary text | #657168 | #aabaaa |
| line | #d9ded2 | #3b4d3e |
| accent | #65816c | #9fba9d |

Headlines use a platform serif stack with CJK serif fallback; body text uses system sans serif. Avoid third-party hosted fonts so Ubuntu builds and public snapshots do not depend on blocked CDNs.

## Renderer mapping

| Function | Private Next.js | Public read-only mirror |
| --- | --- | --- |
| navigation | src/components/site-header.tsx | export-public.mjs shell |
| homepage | src/app/page.tsx | export-public.mjs homepage |
| palette | src/app/v5.css | scripts/public/assets/site.css |
| theme toggle | src/components/theme-toggle.tsx | scripts/public/assets/theme.js |
| article | src/app/articles/[slug]/page.tsx | sanitized markdown export |
| search | SQLite FTS5 | exported search-index.json |

The static mirror is not a React or SSR copy of the CMS. The published HTML must contain no interactive admin code, secret fields, or database credentials.

## Responsive, UX and accessibility checklist

- Test desktop 1440px and tablet 768px; mobile 375px and 320px; no sideways scrolling.
- Use native links and buttons, visible focus indicators, descriptive landmark labels and a focusable skip-to-content anchor.
- Theme state persists in localStorage with exception-safe fallback, and CSS handles reduced-motion preferences.
- No ambient external network calls for fonts, tracking, or decorative images.
- Run node tests for SEO canonical links, subpath (/blog) exports and private-data exclusion.
- Use screen captures and human review before announcing visual polish as finished. GitHub CI validates code, not subjective appearance.
