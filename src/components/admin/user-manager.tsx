"use client";
import {FormEvent,useEffect,useState} from "react";
import {write} from "@/components/admin/api";
type User={id:string;email:string;displayName:string;role:string};
export function UserManager(){const [users,setUsers]=useState<User[]>([]);const [error,setError]=useState("");const [busy,setBusy]=useState(false);
 useEffect(()=>{fetch("/api/admin/users/",{cache:"no-store"}).then(r=>r.json()).then(r=>setUsers(r.users||[])).catch(()=>setError("无法读取用户"));},[]);
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setError("");setBusy(true);const form=e.currentTarget;const data=Object.fromEntries(new FormData(form));try{const result=await write("/api/admin/users/","POST",data);setUsers(prev=>[...prev,result.user]);form.reset();}catch(e){setError(e instanceof Error?e.message:"Create failed");}finally{setBusy(false);}}
 return <><form onSubmit={submit} className="admin-form"><label>邮箱<input type="email" required name="email"/></label><label>显示名称<input required name="displayName" minLength={2}/></label><label>初始密码（12 字符以上）<input type="password" autoComplete="new-password" minLength={12} required name="password"/></label><label>权限<select name="role" defaultValue="EDITOR"><option value="EDITOR">Editor</option><option value="ADMIN">Admin</option></select></label>{error&&<p className="admin-error" role="alert">{error}</p>}<button type="submit" disabled={busy} className="button-primary">创建账户</button></form><div className="admin-media-list">{users.map(user=><div className="admin-post" key={user.id}><strong>{user.displayName}</strong><small>{user.email} · {user.role}</small></div>)}</div></>;
}
