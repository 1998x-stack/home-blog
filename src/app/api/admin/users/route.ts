import {NextRequest,NextResponse} from "next/server";
import {db} from "@/lib/prisma";
import {apiUser} from "@/lib/api-auth";
import {verifyWrite,forbidden,badRequest,unauthorized} from "@/lib/csrf";
import {passwordHash} from "@/lib/password";
import {userInput} from "@/lib/validation";
export async function GET(req:NextRequest){
  const user=await apiUser(req);if(!user)return unauthorized();if(user.role!=="ADMIN")return forbidden();
  const users=await db.user.findMany({select:{id:true,email:true,displayName:true,role:true,disabled:true,createdAt:true},orderBy:{createdAt:"asc"}});
  return NextResponse.json({users},{headers:{"Cache-Control":"no-store"}});
}
export async function POST(req:NextRequest){
  if(!verifyWrite(req))return forbidden();const user=await apiUser(req);if(!user)return unauthorized();if(user.role!=="ADMIN")return forbidden();
  if(Number(req.headers.get("content-length")||0)>4096)return badRequest("Too large",413);
  const parsed=userInput.safeParse(await req.json().catch(()=>null));if(!parsed.success)return badRequest("Invalid user data");
  const {email,displayName,role,password}=parsed.data;
  const prior=await db.user.findUnique({where:{email}});if(prior)return badRequest("Email already exists",409);
  const saved=await db.user.create({data:{email,displayName,role,passwordHash:await passwordHash(password)}});
  return NextResponse.json({user:{id:saved.id,email,displayName,role}},{status:201,headers:{"Cache-Control":"no-store"}});
}
