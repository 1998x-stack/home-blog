import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,rmSync,mkdirSync,writeFileSync,readdirSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
test('backup includes WAL-committed rows and media; verify and explicit restore work',()=>{
 const dir=mkdtempSync(join(tmpdir(),'blog-backup-'));
 try{
  const db=join(dir,'blog.db'),uploads=join(dir,'uploads'),archives=join(dir,'backups');
  mkdirSync(uploads);writeFileSync(join(uploads,'image.png'),'TEST_MEDIA');
  execFileSync('sqlite3',[db,'CREATE TABLE data (n INTEGER);INSERT INTO data VALUES (42);PRAGMA journal_mode=WAL;']);
  const env={...process.env,DATABASE_URL:`file:${db}`,MEDIA_DIR:uploads,BACKUP_DIR:archives};
  const result=JSON.parse(execFileSync('node',['scripts/backup.mjs'],{env,encoding:'utf8'}));
  assert.equal(result.files,2);
  assert.equal(readdirSync(archives).filter(x=>x.endsWith('.tar.gz')).length,1);
  assert.match(execFileSync('node',['scripts/restore.mjs',result.archive],{env,encoding:'utf8'}),/VERIFIED/);
  const restoreDb=join(dir,'isolated.db'),restoreMedia=join(dir,'isolated-uploads');
  const restoreEnv={...env,DATABASE_URL:`file:${restoreDb}`,MEDIA_DIR:restoreMedia,ALLOW_RESTORE:'YES'};
  assert.match(execFileSync('node',['scripts/restore.mjs',result.archive,'--apply'],{env:restoreEnv,encoding:'utf8'}),/RESTORED/);
  assert.equal(execFileSync('sqlite3',[restoreDb,'SELECT n FROM data;'],{encoding:'utf8'}).trim(),'42');
  assert.equal(readFileSync(join(restoreMedia,'image.png'),'utf8'),'TEST_MEDIA');
 }finally{rmSync(dir,{recursive:true,force:true});}
});
