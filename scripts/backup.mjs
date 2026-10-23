#!/usr/bin/env node
/** Crash-consistent SQLite snapshot + media archive + manifest. No dependency on Prisma. */
import { execFileSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve, relative, sep } from 'node:path';

const location=process.env.DATABASE_URL ?? '';
if (!location.startsWith('file:')) throw Error('Expected file: SQLite DATABASE_URL');
const dbPath=resolve(location.slice(5));
const mediaPath=resolve(process.env.MEDIA_DIR ?? '/data/uploads');
const archiveDir=resolve(process.env.BACKUP_DIR ?? '/data/backups');
const retention=Math.max(7,Number(process.env.BACKUP_RETENTION_DAYS ?? 21));
if (!Number.isFinite(retention) || retention > 3650) throw Error('Invalid retention');
if (!existsSync(dbPath)) throw Error(`SQLite database not found: ${dbPath}`);
mkdirSync(archiveDir,{recursive:true,mode:0o700});
const stage=mkdtempSync(join(archiveDir,'.staging-'));
const name=`home-blog-${new Date().toISOString().replace(/[:.]/g,'-')}-${randomBytes(3).toString('hex')}.tar.gz`;
const tempArchive=join(archiveDir,`.${name}.partial`);
const finalArchive=join(archiveDir,name);
const sha=(buf)=>createHash('sha256').update(buf).digest('hex');
function fileEntries(folder,rootName){
  if(!existsSync(folder))return [];
  return readdirSync(folder,{withFileTypes:true}).flatMap(entry=>{
    const path=join(folder,entry.name);
    if(entry.isSymbolicLink())throw Error('Symlinks forbidden in media backup');
    if(entry.isDirectory())return fileEntries(path,rootName);
    if(!entry.isFile())throw Error('Unsupported media file type');
    const rel=relative(stage,path).split(sep).join('/');
    if(!rel.startsWith(rootName+'/'))throw Error('Unsafe backup path');
    const data=readFileSync(path);
    return [{path:rel,size:data.length,sha256:sha(data)}];
  });
}
try {
  // sqlite3's .backup takes a consistent online snapshot, including committed WAL transactions.
  execFileSync('sqlite3',[dbPath,`.backup '${join(stage,'blog.db').replaceAll("'","''")}'`],{stdio:'pipe'});
  execFileSync('sqlite3',[join(stage,'blog.db'),'PRAGMA integrity_check;'],{encoding:'utf8'}).trim()==='ok'||(()=>{throw Error('SQLite integrity check failed');})();
  mkdirSync(join(stage,'uploads'),{mode:0o700});
  if (existsSync(mediaPath)) execFileSync('cp',['-a',`${mediaPath}/.`,join(stage,'uploads')]);
  const files=[{path:'blog.db',size:statSync(join(stage,'blog.db')).size,sha256:sha(readFileSync(join(stage,'blog.db')))},...fileEntries(join(stage,'uploads'),'uploads')];
  writeFileSync(join(stage,'manifest.json'),JSON.stringify({schema:1,createdAt:new Date().toISOString(),files},null,2)+'\n',{mode:0o600});
  execFileSync('tar',['-czf',tempArchive,'-C',stage,'manifest.json','blog.db','uploads'],{stdio:'pipe'});
  renameSync(tempArchive,finalArchive);
  const threshold=Date.now()-retention*86400_000;
  for (const file of readdirSync(archiveDir)){
    if(/^home-blog-.*\.tar\.gz$/.test(file) && statSync(join(archiveDir,file)).mtimeMs<threshold) rmSync(join(archiveDir,file));
  }
  process.stdout.write(JSON.stringify({archive:finalArchive,files:files.length,sha256:sha(readFileSync(finalArchive))})+'\n');
} finally {rmSync(stage,{recursive:true,force:true});rmSync(tempArchive,{force:true});}
