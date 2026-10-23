"use client";
import {FormEvent,useEffect,useState} from "react";
import {write} from "@/components/admin/api";
type MediaItem={id:string;originalName:string;mimeType:string;byteSize:number;isPublic:boolean};
export function MediaManager(){const [items,setItems]=useState<MediaItem[]>([]);const [error,setError]=useState("");const [busy,setBusy]=useState(false);
 useEffect(()=>{fetch("/api/admin/media/",{cache:"no-store"}).then(x=>x.json()).then(x=>setItems(x.items||[])).catch(()=>setError("无法加载媒体"));},[]);
 async function upload(e:FormEvent<HTMLFormElement>){e.preventDefault();setError("");setBusy(true);const element=e.currentTarget;const input=element.elements.namedItem("file") as HTMLInputElement;const file=input.files?.[0];try{if(!file)throw Error("请选择图片");const data=new FormData();data.append("file",file);const result=await write("/api/admin/media/","POST",data);setItems(old=>[result.item,...old]);element.reset();}catch(err){setError(err instanceof Error?err.message:"Upload failed");}finally{setBusy(false);}}
 return <><form className="admin-form" onSubmit={upload}><label>图片（JPEG / PNG / WEBP，单张最多 5 MB）<input name="file" type="file" accept="image/jpeg,image/png,image/webp" required/></label><button type="submit" disabled={busy} className="button-primary">上传图片</button></form>{error&&<p className="admin-error" role="alert">{error}</p>}<div className="admin-media-list">{items.map(item=><div key={item.id} className="admin-post"><strong>{item.originalName}</strong><small>{Math.round(item.byteSize/1024)} KB · {item.isPublic?"公开":"私有"}</small><button className="admin-small-button" onClick={()=>navigator.clipboard.writeText(`![${item.originalName}](/media/${item.id})`)}>复制 Markdown</button></div>)}</div></>;
}
