import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { passwordHash } from "../src/lib/password";

async function main(){
 const email=(process.env.ADMIN_EMAIL||"").trim().toLowerCase();
 const password=process.env.ADMIN_PASSWORD||"";
 if(!/^[^@]+@[^@]+\.[^@]+$/.test(email)||password.length<12)throw Error("Set ADMIN_EMAIL and a strong ADMIN_PASSWORD (>=12 chars) using temporary environment variables");
 if(!process.env.DATABASE_URL)throw Error("Missing DATABASE_URL");
 const db=new PrismaClient({adapter:new PrismaBetterSqlite3({url:process.env.DATABASE_URL})});
 try {
  const existing=await db.user.findUnique({where:{email}});
  if(existing)throw Error("Admin already exists; bootstrap does not reset credentials");
  if(await db.user.count()>0)throw Error("Bootstrap disabled after any user exists; create users via admin UI");
  await db.user.create({data:{email,passwordHash:await passwordHash(password),displayName:"Site Admin",role:"ADMIN"}});
  console.log(`Bootstrap admin created: ${email}`);
 }finally{await db.$disconnect();}
}
main().catch(err=>{console.error(err.message);process.exitCode=1;});
