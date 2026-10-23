import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('v5 public mirror renders editorial home, prefixed links and keeps drafts private', () => {
  const work = mkdtempSync(join(tmpdir(), 'home-blog-v5-'));
  try {
    const db = join(work, 'blog.db');
    const out = join(work, 'export');
    mkdirSync(join(work, 'uploads'));
    execFileSync('sqlite3', [db, [
      'CREATE TABLE Post(slug TEXT,title TEXT,summary TEXT,markdown TEXT,tags TEXT,featured INTEGER,status TEXT,publishedAt TEXT,updatedAt TEXT);',
      'CREATE TABLE Media(id TEXT,storedName TEXT,mimeType TEXT,isPublic INTEGER);',
      "INSERT INTO Post VALUES('public-note','慢一点，想清楚','一段可公开阅读的工程思考笔记','## 过程与结果\\n认真记录。','[\"engineering\"]',1,'PUBLISHED','2026-01-01T00:00:00Z','2026-01-01T00:00:00Z');",
      "INSERT INTO Post VALUES('secret-note','不应公开','private token and personal record','do-not-expose','[]',0,'DRAFT',NULL,NULL);"
    ].join('')]);
    execFileSync(process.execPath, ['scripts/public/export-public.mjs'], {
      env: {...process.env,DATABASE_URL:'file:'+db,MEDIA_DIR:join(work,'uploads'),PUBLIC_EXPORT_DIR:out,PUBLIC_SITE_URL:'https://example.com/blog'},
      stdio:'pipe'
    });
    const home = readFileSync(join(out,'index.html'),'utf8');
    const article = readFileSync(join(out,'articles/public-note/index.html'),'utf8');
    const css = readFileSync(join(out,'assets/site.css'),'utf8');
    const js = readFileSync(join(out,'assets/theme.js'),'utf8');
    assert.match(home,/写给好奇心的/);
    assert.match(home,/FOLLOW A THREAD/);
    assert.match(home,/慢一点，想清楚/);
    assert.match(home,/href="\/blog\/articles\/"/);
    assert.match(home,/src="\/blog\/assets\/theme\.js"/);
    assert.match(home,/href="#content"/);
    assert.match(article,/https:\/\/example.com\/blog\/articles\/public-note\//);
    assert.match(article,/认真记录/);
    assert.match(css,/prefers-reduced-motion/);
    assert.match(css,/data-theme=dark/);
    assert.match(js,/home-blog-theme/);
    assert.doesNotMatch([home,article,readFileSync(join(out,'search-index.json'),'utf8')].join(' '),/secret-note|private token|do-not-expose/);
    assert.ok(!existsSync(join(out,'admin')));
    assert.ok(!existsSync(join(out,'api')));
  } finally {
    rmSync(work,{recursive:true,force:true});
  }
});
