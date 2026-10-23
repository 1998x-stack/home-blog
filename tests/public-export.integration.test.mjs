import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {existsSync,mkdtempSync,readFileSync,rmSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

test('public mirror does not export drafts, future posts, private media or admin data',()=>{
  const work=mkdtempSync(join(tmpdir(),'home-blog-public-'));
  try {
    const db=join(work,'test.db'),exportDir=join(work,'public');
    mkdirSync(join(work,'uploads'));
    const SQL=`CREATE TABLE Post (slug TEXT,title TEXT,summary TEXT,markdown TEXT,tags TEXT,featured INTEGER,status TEXT,publishedAt TEXT,updatedAt TEXT); CREATE TABLE Media (id TEXT,storedName TEXT,mimeType TEXT,isPublic INTEGER); INSERT INTO Post VALUES('visible','公开文章','可公开的摘要','欢迎阅读公开内容','["engineering"]',0,'PUBLISHED','2026-01-02T00:00:00Z','2026-01-02T00:00:00Z'); INSERT INTO Post VALUES('hidden','私密文章','不可见摘要','private draft password','[]',0,'DRAFT',NULL,NULL); INSERT INTO Post VALUES('future','定时文章','未到发布时间','future secret','[]',0,'PUBLISHED','2099-01-01T00:00:00Z',NULL); INSERT INTO Media VALUES('private12345678901234567890','12345678-1234-1234-1234-123456789abc.png','image/png',0);`;
    execFileSync('sqlite3',[db,SQL]);
    execFileSync(process.execPath,['scripts/public/export-public.mjs'],{env:{...process.env,DATABASE_URL:'file:'+db,MEDIA_DIR:join(work,'uploads'),PUBLIC_EXPORT_DIR:exportDir,PUBLIC_SITE_URL:'https://example.com'},stdio:'pipe'});
    const index=readFileSync(join(exportDir,'search-index.json'),'utf8');
    assert.match(index,/visible/);
    assert.doesNotMatch(index,/hidden|future|password|secret/);
    assert.ok(existsSync(join(exportDir,'articles/visible/index.html')));
    assert.ok(!existsSync(join(exportDir,'articles/hidden/index.html')));
    assert.ok(!existsSync(join(exportDir,'articles/future/index.html')));
    assert.ok(!existsSync(join(exportDir,'admin')));
    assert.ok(!existsSync(join(exportDir,'api')));
    assert.ok(!existsSync(join(exportDir,'media')));
    const sitemap=readFileSync(join(exportDir,'sitemap.xml'),'utf8');
    assert.doesNotMatch(sitemap,/hidden|future/);
  }finally{rmSync(work,{force:true,recursive:true});}
});

test('public static mirror supports /blog canonical, JSON-LD, search and sitemap',()=>{
  const work=mkdtempSync(join(tmpdir(),'home-blog-prefix-'));
  try {
    const db=join(work,'test.db'),out=join(work,'public');
    mkdirSync(join(work,'uploads'));
    const SQL=`CREATE TABLE Post (slug TEXT,title TEXT,summary TEXT,markdown TEXT,tags TEXT,featured INTEGER,status TEXT,publishedAt TEXT,updatedAt TEXT); CREATE TABLE Media (id TEXT,storedName TEXT,mimeType TEXT,isPublic INTEGER); INSERT INTO Post VALUES('transformer-explained','Transformer 精读','解释注意力机制和 Transformer 结构','## 核心原理\\nTransformer uses attention','["llm","research"]',1,'PUBLISHED','2026-10-23T00:00:00Z','2026-10-23T00:00:00Z');`;
    execFileSync('sqlite3',[db,SQL]);
    execFileSync(process.execPath,['scripts/public/export-public.mjs'],{env:{...process.env,DATABASE_URL:'file:'+db,MEDIA_DIR:join(work,'uploads'),PUBLIC_EXPORT_DIR:out,PUBLIC_SITE_URL:'https://xstack.space/blog'},stdio:'pipe'});
    const html=readFileSync(join(out,'articles/transformer-explained/index.html'),'utf8');
    assert.match(html,/https:\/\/xstack\.space\/blog\/articles\/transformer-explained\//);
    assert.match(html,/href="\/blog\/assets\/site\.css"/);
    assert.match(html,/"@type":"BlogPosting"/);
    assert.match(html,/href="\/blog\/articles\/"/);
    assert.match(readFileSync(join(out,'sitemap.xml'),'utf8'),/https:\/\/xstack\.space\/blog\/articles\/transformer-explained\//);
    assert.match(readFileSync(join(out,'llms.txt'),'utf8'),/Transformer 精读/);
    assert.match(readFileSync(join(out,'assets/search.js'),'utf8'),/basePath\+'\/search-index\.json'/);
  }finally{rmSync(work,{force:true,recursive:true});}
});
