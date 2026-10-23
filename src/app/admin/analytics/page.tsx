import {requireUser} from "@/lib/session";
import {db} from "@/lib/prisma";

export const dynamic="force-dynamic";
export const metadata={title:"访问统计",robots:{index:false,follow:false}};
export default async function AnalyticsPage(){
  await requireUser();
  const from=new Date(Date.now()-29*86400000).toISOString().slice(0,10);
  const entries=await db.pageViewDaily.findMany({where:{day:{gte:from}},orderBy:[{day:"asc"},{pageKey:"asc"}]});
  const daily=new Map<string,number>();
  const pages=new Map<string,number>();
  for(const row of entries){daily.set(row.day,(daily.get(row.day)??0)+row.views);pages.set(row.pageKey,(pages.get(row.pageKey)??0)+row.views);}
  const days=Array.from({length:30},(_,i)=>new Date(Date.now()-(29-i)*86400000).toISOString().slice(0,10));
  const peak=Math.max(1,...daily.values());
  const total=entries.reduce((n,v)=>n+v.views,0);
  const popular=[...pages].sort((a,b)=>b[1]-a[1]).slice(0,12);
  return <section className="container page-section">
    <div className="page-intro"><span className="eyebrow">OPERATIONS</span><h1>访问统计<span className="title-period">.</span></h1>
      <p>过去 30 天累计 {total} 次页面浏览。仅统计汇总次数，不记录独立访客、IP、设备指纹或搜索关键词。</p></div>
    <section className="analytics-chart" aria-label="最近30天浏览次数">
      {days.map(day=><div key={day} className="analytics-column" title={`${day}: ${daily.get(day)??0} PV`}>
        <div className="analytics-bar" style={{height:`${Math.max(3,Math.round((daily.get(day)??0)/peak*100))}%`}}/><span>{day.slice(-2)}</span>
      </div>)}
    </section>
    <h2>热门页面</h2>
    <div className="admin-list">{popular.map(([pageKey,views])=><div className="admin-post" key={pageKey}><strong>{pageKey}</strong><small>{views} PV</small></div>)}</div>
    <p className="empty-state">注意：刷新、重复访问和自动化请求可能增加 PV；这不是独立访客（UV）指标。</p>
  </section>;
}
