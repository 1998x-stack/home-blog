"use client";
import {FormEvent,useState} from "react";
import {write} from "@/components/admin/api";
export function LoginForm(){
 const [email,setEmail]=useState("");const [password,setPassword]=useState("");
 const [error,setError]=useState("");const [busy,setBusy]=useState(false);
 async function submit(event:FormEvent){event.preventDefault();setError("");setBusy(true);try{await write("/api/auth/login/","POST",{email,password});window.location.assign("/admin/");}catch(e){setError(e instanceof Error?e.message:"Login failed");}finally{setBusy(false);}}
 return <form className="admin-form" onSubmit={submit}><label>电子邮箱<input autoComplete="username" type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label><label>密码<input autoComplete="current-password" type="password" required value={password} onChange={e=>setPassword(e.target.value)}/></label>{error&&<p role="alert" className="admin-error">{error}</p>}<button disabled={busy} className="button-primary" type="submit">{busy?"验证中…":"安全登录"}</button></form>;
}
