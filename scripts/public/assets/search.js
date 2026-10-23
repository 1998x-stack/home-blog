'use strict';
(async()=>{
 const input=document.querySelector('#q'),target=document.querySelector('#results');
 const asset=document.querySelector('script[src$="/assets/search.js"]');
 const basePath=(asset?.getAttribute('src')||'/assets/search.js').replace(/\/assets\/search\.js$/,'');
 if(!input||!target)return;
 let articles=[];
 try{const response=await fetch(basePath+'/search-index.json',{cache:'force-cache'});if(!response.ok)throw Error('fetch failed');articles=await response.json();}
 catch{target.textContent='搜索索引暂不可用';return;}
 const render=()=>{const q=input.value.normalize('NFKC').trim().toLowerCase().slice(0,80);target.replaceChildren();if(!q)return;
  const hits=articles.filter(a=>(a.title+' '+a.summary+' '+a.text).normalize('NFKC').toLowerCase().includes(q)).slice(0,25);
  if(!hits.length){target.textContent='无匹配结果';return;}
  for(const hit of hits){const article=document.createElement('article');article.className='card';const h=document.createElement('h2');const link=document.createElement('a');link.href=basePath+'/articles/'+encodeURIComponent(hit.slug)+'/';link.textContent=hit.title;h.append(link);const p=document.createElement('p');p.textContent=hit.summary;article.append(h,p);target.append(article);}
 };input.addEventListener('input',render);const params=new URLSearchParams(location.search);if(params.has('q')){input.value=params.get('q').slice(0,80);render();}
})();
