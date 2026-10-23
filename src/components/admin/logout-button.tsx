"use client";
import {useState} from "react";
import {write} from "@/components/admin/api";
export function LogoutButton(){const [busy,setBusy]=useState(false);return <button className="admin-small-button" disabled={busy} onClick={async()=>{setBusy(true);try{await write("/api/auth/logout/","POST",{});window.location.assign("/admin/login/");}finally{setBusy(false);}}}>退出登录</button>;}
