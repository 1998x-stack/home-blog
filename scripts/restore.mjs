#!/usr/bin/env node
/** Verify in isolated temp dir by default; --apply explicitly replaces /data after app stops. */
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,mkdtempSync,readFileSync,readdirSync,rmSync,renameSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
const file=process.argv[2];
const apply=process.argv.includes('--apply');
if(!file || !existsSync(file))throw Error('Usage: node scripts/restore.mjs <backup.tar.gz> [--apply]');
if(apply && process.env.ALLOW_RESTORE!=='YES')throw Error('Refusing destructive restore without ALLOW_RESTORE=YES');
const dbUrl=process.env.DATABASE_URL??'';
if (!dbUrl.startsWith('file:'))throw Error('DATABASE_URL must point to SQLite');
const db=resolve(dbUrl.slice(5)),media=resolve(process.env.MEDIA_DIR??'/data/uploads');
const stage=mkdtempSync(join(dirname(resolve(file)),'.restore-'));
const digest=(data)=>createHash('sha256').update(data).digest('hex');
try {
  const list=execFileSync('tar',['-tzf',resolve(file)],{encoding:'utf8'}).split('\n').filter(Boolean);
  if(list.some(path=>path.startsWith('/') || path.split('/').includes('..') || path.startsWith('-')))throw Error('Unsafe archive path');
  const listing=execFileSync('tar',['-tvzf',resolve(file)],{encoding:'utf8'}).split('\n').filter(Boolean);
  if (listing.some(line=> !['-','d'].includes(line[0]))) throw Error('Backup must not contain links or special files');
  execFileSync('tar',['-xzf',resolve(file),'-C',stage,'--no-same-owner','--no-same-permissions']);
  // Reject links/special files, and ignore no extra untracked payload.
  function walk(folder){return readdirSync(folder,{withFileTypes:true}).flatMap(e=>{
    if(e.isSymbolicLink()||(!e.isDirectory()&&!e.isFile()))throw Error('Unsafe archive file type');
    return e.isDirectory()?walk(join(folder,e.name)):[join(folder,e.name)];
  });}
  const paths=walk(stage);
  const manifest=JSON.parse(readFileSync(join(stage,'manifest.json'),'utf8'));
  if(manifest.schema!==1||!Array.isArray(manifest.files))throw Error('Unexpected backup format');
  const expected=new Set(['manifest.json',...manifest.files.map(x=>x.path)]);
  for(const path of paths){const rel=path.slice(stage.length+1).replaceAll('\\','/');if(!expected.has(rel))throw Error('Unexpected file in archive');}
  if(paths.length!==expected.size)throw Error('Missing backup files');
  for(const item of manifest.files){
    if(!/^(blog\.db|uploads\/[a-zA-Z0-9._/-]+)$/.test(item.path)||item.path.split('/').includes('..'))throw Error('Invalid manifest path');
    const bytes=readFileSync(join(stage,item.path));
    if(bytes.length!==item.size||digest(bytes)!==item.sha256)throw Error('Backup checksum mismatch');
  }
  const output=execFileSync('sqlite3',[join(stage,'blog.db'),'PRAGMA integrity_check;'],{encoding:'utf8'}).trim();
  if(output!=='ok')throw Error(`SQLite integrity check failed: ${output}`);
  if(!apply){console.log(`VERIFIED ${manifest.files.length} files; created ${manifest.createdAt}`);process.exit(0);}
  // App must be stopped. Avoid SQLite WAL files left from previous DB.
  if(existsSync(db+'-wal')||existsSync(db+'-shm'))throw Error('WAL/SHM files exist; stop app and checkpoint before restore');
  const stamp=Date.now();
  if(existsSync(db))renameSync(db,`${db}.before-restore-${stamp}`);
  if(existsSync(media))renameSync(media,`${media}.before-restore-${stamp}`);
  mkdirSync(dirname(db),{recursive:true});
  renameSync(join(stage,'blog.db'),db);
  mkdirSync(dirname(media),{recursive:true});
  renameSync(join(stage,'uploads'),media);
  console.log('RESTORED database and uploads; verify before deleting .before-restore files');
}finally{rmSync(stage,{recursive:true,force:true});}
