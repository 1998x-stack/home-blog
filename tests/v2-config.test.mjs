import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const read=(file)=>fs.readFileSync(file,"utf8");
test("V2 uses server runtime and avoids static export",()=>{
  assert.match(read("next.config.ts"),/standalone/);
  assert.doesNotMatch(read("next.config.ts"),/output:\s*["']export["']/);
});
test("data model has secure session, post snapshots, and private uploads",()=>{
  const schema=read("prisma/schema.prisma");
  for(const name of ["User","Session","Post","PostRevision","Media","LoginAttempt"])assert.match(schema,new RegExp(`model ${name} \\{`));
  assert.match(schema,/tokenHash\s+String/);
  assert.match(schema,/isPublic\s+Boolean/);
});
test("all write APIs call CSRF validation",()=>{
  for(const path of ["src/app/api/auth/login/route.ts","src/app/api/auth/logout/route.ts","src/app/api/admin/posts/route.ts","src/app/api/admin/posts/[id]/route.ts","src/app/api/admin/posts/[id]/restore/route.ts","src/app/api/admin/media/route.ts","src/app/api/admin/users/route.ts"])assert.match(read(path),/verifyWrite\(req(?:uest)?\)/,path);
});
