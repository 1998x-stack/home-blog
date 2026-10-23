'use strict';
(()=>{const key='home-blog-theme';const root=document.documentElement;const btn=document.querySelector('#theme-toggle');
const choose=()=>{try{const selected=localStorage.getItem(key);if(selected==='light'||selected==='dark')return selected;}catch{}return matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';};
let current=choose();const apply=()=>{root.dataset.theme=current;if(btn){btn.textContent=current==='dark'?'☀':'☾';btn.setAttribute('aria-label',current==='dark'?'切换到浅色模式':'切换到深色模式');}};
apply();btn?.addEventListener('click',()=>{current=current==='dark'?'light':'dark';try{localStorage.setItem(key,current);}catch{}apply();});
})();