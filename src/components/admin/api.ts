"use client";
export async function csrf(){
  const res=await fetch("/api/auth/csrf/",{credentials:"same-origin",cache:"no-store"});
  if(!res.ok)throw Error("Cannot initialize secure session");
  return (await res.json() as {csrf:string}).csrf;
}
export async function write(url:string,method:string,body:unknown){
  const token=await csrf();const isForm=body instanceof FormData;
  const res=await fetch(url,{method,headers:{"x-csrf-token":token,...(isForm?{}:{"Content-Type":"application/json"})},body:isForm?body:JSON.stringify(body),credentials:"same-origin",cache:"no-store"});
  const data=await res.json().catch(()=>({error:"Unexpected response"}));
  if(!res.ok)throw Error(data.error||`HTTP ${res.status}`);
  return data;
}
