import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const source=readFileSync('src/lib/search/fts.ts','utf8');
test('Short-query fallback uses one-character SQLite ESCAPE (not invalid backslash pair)',()=>{
  assert.match(source,/ESCAPE '!'/);
  assert.match(source,/replace\(\/\[!%_\]\/g, "!\$&"\)/);
  const dir=mkdtempSync(join(tmpdir(),'fts-short-'));
  try{
    const db=join(dir,'data.db');
    const sql=x=>execFileSync('sqlite3',[db,x],{encoding:'utf8'}).trim();
    sql("CREATE TABLE Post(title TEXT); INSERT INTO Post VALUES('中%安全'),('中X安全'),('中_安全'),('中!安全');");
    const escape=q=>q.replace(/[!%_]/g,'!$&').replaceAll("'","''");
    assert.equal(sql(`SELECT count(*) FROM Post WHERE title LIKE '%${escape('中%')}%' ESCAPE '!';`),'1');
    assert.equal(sql(`SELECT count(*) FROM Post WHERE title LIKE '%${escape('中_')}%' ESCAPE '!';`),'1');
    assert.equal(sql(`SELECT count(*) FROM Post WHERE title LIKE '%${escape('中!')}%' ESCAPE '!';`),'1');
  }finally{rmSync(dir,{force:true,recursive:true});}
});
