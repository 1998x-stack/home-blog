import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const migration=readFileSync('prisma/migrations/20261023030000_fts_analytics/migration.sql','utf8');
function sql(db,statement){return execFileSync('sqlite3',['-batch',db,statement],{encoding:'utf8'}).trim();}
test('trigram index maintains published content on update/unpublish/delete, ignores drafts',()=>{
 const dir=mkdtempSync(join(tmpdir(),'blog-fts-')),db=join(dir,'test.db');
 try {
  sql(db,`CREATE TABLE Post (id TEXT PRIMARY KEY,title TEXT,summary TEXT,markdown TEXT,status TEXT,publishedAt DATETIME);`);
  writeFileSync(join(dir,'v3.sql'),migration);
  execFileSync('sqlite3',[db],{input:migration});
  sql(db,`INSERT INTO Post VALUES ('a','图数据库基础','结构','Neo4j 查找索引','PUBLISHED',CURRENT_TIMESTAMP);`);
  sql(db,`INSERT INTO Post VALUES ('draft','内部保密','内部信息','只有草稿','DRAFT',NULL);`);
  assert.equal(sql(db,`SELECT postId FROM PostFTS WHERE PostFTS MATCH '"图数据库"';`),'a');
  assert.equal(sql(db,`SELECT count(*) FROM PostFTS WHERE PostFTS MATCH '"内部保密"';`),'0');
  sql(db,`UPDATE Post SET markdown='语义搜索检索系统' WHERE id='a';`);
  assert.equal(sql(db,`SELECT postId FROM PostFTS WHERE PostFTS MATCH '"语义搜索"';`),'a');
  assert.equal(sql(db,`SELECT count(*) FROM PostFTS WHERE PostFTS MATCH '"Neo4j"';`),'0');
  sql(db,`UPDATE Post SET status='DRAFT' WHERE id='a';`);
  assert.equal(sql(db,`SELECT count(*) FROM PostFTS;`),'0');
  sql(db,`UPDATE Post SET status='PUBLISHED' WHERE id='draft';`);
  assert.equal(sql(db,`SELECT postId FROM PostFTS WHERE PostFTS MATCH '"内部保密"';`),'draft');
  sql(db,`DELETE FROM Post WHERE id='draft';`);
  assert.equal(sql(db,`SELECT count(*) FROM PostFTS;`),'0');
  const table=sql(db,"SELECT name FROM sqlite_master WHERE type='table' AND name='PageViewDaily';");
  assert.equal(table,'PageViewDaily');
 }finally{rmSync(dir,{recursive:true,force:true});}
});
