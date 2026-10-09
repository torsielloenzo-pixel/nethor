(function(){
'use strict';
if(window.__nethorPageEditorLoaded)return;window.__nethorPageEditorLoaded=true;
const U='https://gioxrpaiwogqqtakjpnv.supabase.co',K='sb_publishable_nJPMS-Z_20ng1aMJmufbmg_gWFFndrC';
let client=null,session=null,editing=false,dirty=false,layouts={},backupLayouts=null,observer=null,timer=0,interaction=null,lastView='',resizeTick=0;
const originalInline=new WeakMap(),lastApplied=new WeakMap();
const pageKey=()=>{const p=location.pathname.split('/').pop()||'home.html';return p.split('?')[0]||'home.html'};
const platform=()=>String(document.documentElement.dataset.nethorPlatform||window.NethorPlatform?.current?.()||'desktop').toLowerCase()==='mobile'?'mobile':'desktop';
const selector='[data-nethor-widget],[data-widget-id],.ndCard,.ndKpi,.ndHeroSlot,.ndPlanningSlot,.mhdCard,.mhdSection,.mhdWidget,.operationsWidgetAdminCard,.quickPlanningWidget,.storeInfoWidget';
function candidate(el){if(!(el instanceof HTMLElement)||el.closest('#nethorPageEditorUI'))return false;if(el.matches('button,a,input,select,textarea,nav,header,footer'))return false;const r=el.getBoundingClientRect();return r.width>90&&r.height>45}
function targets(){return [...document.querySelectorAll(selector)].filter(candidate).filter(el=>{const p=el.parentElement?.closest(selector);return !p||!candidate(p)})}
function label(el,i){const v=el.dataset.nethorWidget||el.dataset.widgetId||el.id;if(v)return v.replace(/^nethorDesktop/,'').replace(/Widget$/,'').replace(/[-_]/g,' ');const h=el.querySelector('h1,h2,h3,strong,.ndSectionTitle,.mhdTitleWithIcon');return String(h?.textContent||'Widget '+(i+1)).replace(/\s+/g,' ').trim().slice(0,48)}
function key(el,i){
 if(el.dataset.nethorEditorKey)return el.dataset.nethorEditorKey;
 const explicit=el.id||el.dataset.nethorWidget||el.dataset.widgetId;
 if(explicit)return 'id_'+explicit;
 const classes=[...el.classList].filter(x=>/^nd|^mhd|Widget|widget/i.test(x)).slice(0,3);
 const cls=classes.join('_')||'widget';
 const slug=label(el,i).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
 const legacy='auto_'+cls+'_'+slug,stored=layouts[pageKey()]?.[viewKey()]||{};
 if(Object.prototype.hasOwnProperty.call(stored,legacy))return legacy;
 const previous=Object.keys(stored).filter(k=>k.startsWith('auto_'+cls+'_'));
 if(previous.length===1)return previous[0];
 // Stable key independent of changing counts, dates, or widget body text.
 const peers=[...document.querySelectorAll(selector)].filter(node=>node instanceof HTMLElement&&classes.every(c=>node.classList.contains(c))&&[...node.classList].filter(x=>/^nd|^mhd|Widget|widget/i.test(x)).slice(0,3).join('_')===cls);
 const idx=peers.indexOf(el);
 return 'auto_'+cls+'_item_'+Math.max(1,idx+1);
}
function dashboardRoot(el){
 return el?.closest('.nethorDesktopReferenceDashboard')||document.querySelector('.nethorDesktopReferenceDashboard')||document.querySelector('main')||document.body;
}
function contentWidth(){
 const root=dashboardRoot();const r=root.getBoundingClientRect();
 return Math.max(1,Math.round(r.width||window.innerWidth));
}
// Each responsive grid has its own independent layout. The existing 'desktop'
// data remains the wide-screen design; smaller widths never inherit its offsets.
function viewKey(){
 if(platform()==='mobile')return 'mobile';
 const w=contentWidth();
 if(w<=560)return 'desktop_tiny';
 if(w<=820)return 'desktop_small';
 if(w<=1180)return 'desktop_compact';
 return 'desktop';
}
function map(){
 layouts[pageKey()]=layouts[pageKey()]||{};
 const view=viewKey();
 layouts[pageKey()][view]=layouts[pageKey()][view]||{};
 return layouts[pageKey()][view];
}
function rememberInline(el){
 if(!originalInline.has(el))originalInline.set(el,{
  width:el.style.width,height:el.style.height,transform:el.style.transform,
  maxWidth:el.style.maxWidth,boxSizing:el.style.boxSizing
 });
}
function clearEditorStyle(el){
 rememberInline(el);
 const o=originalInline.get(el);
 for(const prop of ['width','height','transform','maxWidth','boxSizing'])el.style[prop]=o[prop]||'';
 el.classList.remove('nethorPageEditorManaged');
 lastApplied.delete(el);
}
function bounds(el,x,y){
 const r=el.getBoundingClientRect(),trans=getComputedStyle(el).transform;
 let tx=0,ty=0;
 if(trans&&trans!=='none'){try{const m=new DOMMatrix(trans);tx=m.m41;ty=m.m42}catch(_){}}
 const natural={left:r.left-tx,top:r.top-ty,width:r.width,height:r.height};
 const outer=dashboardRoot(el).getBoundingClientRect(),pad=8;
 const left=Math.max(4,outer.left+pad);
 const right=Math.min(window.innerWidth-4,outer.right-pad);
 const top=outer.top+pad;
 const bottom=Math.max(top+natural.height,outer.bottom-pad);
 const minX=Math.min(0,left-natural.left),maxX=Math.max(0,right-natural.left-natural.width);
 const minY=Math.min(0,top-natural.top),maxY=Math.max(0,bottom-natural.top-natural.height);
 return {
  x:Math.round(Math.max(minX,Math.min(Math.max(minX,maxX),Number(x)||0))),
  y:Math.round(Math.max(minY,Math.min(Math.max(minY,maxY),Number(y)||0)))
 };
}
function setEditorStyle(el,s){
 rememberInline(el);
 clearEditorStyle(el);
 if(!s||typeof s!=='object')return;
 const w=Number(s.width),h=Number(s.height);
 if(Number.isFinite(w)&&w>0){
  el.style.boxSizing='border-box';
  el.style.maxWidth='100%';
  el.style.width='min(100%, '+Math.max(120,Math.round(w))+'px)';
  el.classList.add('nethorPageEditorManaged');
 }
 if(Number.isFinite(h)&&h>0){
  el.style.height=Math.max(60,Math.round(h))+'px';
  el.classList.add('nethorPageEditorManaged');
 }
 const scale=Math.min(1.25,Math.max(.75,contentWidth()/Math.max(1,Number(s.cw)||contentWidth())));
 const offset=bounds(el,(Number(s.x)||0)*scale,(Number(s.y)||0)*scale);
 if(offset.x||offset.y){
  el.style.transform='translate3d('+offset.x+'px,'+offset.y+'px,0)';
  el.classList.add('nethorPageEditorManaged');
 }
}
function apply(){
 if(editing)return;
 const view=viewKey(),m=map(),w=contentWidth();
 targets().forEach((el,i)=>{
  const k=key(el,i),s=m[k],signature=view+'|'+k+'|'+w+'|'+JSON.stringify(s||null);
  if(lastApplied.get(el)===signature)return;
  setEditorStyle(el,s);
  lastApplied.set(el,signature);
  el.dataset.nethorEditorApplied='1';
 });
 lastView=view;
}
function ensureUI(){if(document.getElementById('nethorPageEditorUI'))return;const w=document.createElement('div');w.id='nethorPageEditorUI';w.innerHTML='<button type="button" class="nethorPageEditorButton" id="nethorPageEditorButton" aria-label="Modifier la page" title="Modifier la page"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 16.5-.8 3.8 3.8-.8L18.7 7.8a2.7 2.7 0 0 0-3.8-3.8L3.2 16.2Z"/><path d="m13.5 5.7 4.8 4.8"/></svg></button>';document.body.appendChild(w);w.firstElementChild.onclick=()=>editing?finish(true):start()}
function bar(){const b=document.createElement('div');b.className='nethorPageEditorBar';b.id='nethorPageEditorBar';b.innerHTML='<span class="nethorPageEditorHint">Mode édition · déplace ou redimensionne les widgets</span><button type="button" class="cancel">Annuler</button><button type="button" class="save">Enregistrer</button>';document.body.appendChild(b);b.querySelector('.cancel').onclick=()=>finish(true);b.querySelector('.save').onclick=save}
function render(){
 if(interaction)return;
 const view=viewKey(),changed=view!==lastView,m=map(),seen=new Set();
 if(changed)lastView=view;
 targets().forEach((el,i)=>{
  const k=key(el,i);seen.add(el);
  el.dataset.nethorEditorKey=k;el.dataset.nethorEditorLabel=label(el,i);
  const fresh=!el.classList.contains('nethorPageEditorTarget');
  el.classList.add('nethorPageEditorTarget');
  if(fresh||changed)setEditorStyle(el,m[k]);
  el.onpointerdown=down;
  if(![...el.children].some(child=>child.classList.contains('nethorPageEditorHandle'))){
   const h=document.createElement('span');h.className='nethorPageEditorHandle';h.setAttribute('aria-hidden','true');el.appendChild(h);
  }
 });
 document.querySelectorAll('.nethorPageEditorTarget').forEach(el=>{
  if(seen.has(el))return;
  el.classList.remove('nethorPageEditorTarget','is-selected');
  el.querySelectorAll('.nethorPageEditorHandle').forEach(h=>h.remove());
  el.onpointerdown=null;
 });
 if(changed){hideGuides();document.querySelector('.nethorEditorMeasurement')?.classList.remove('is-visible')}
}
function editorOverlay(){
 let root=document.getElementById('nethorPageEditorOverlay');
 if(root)return root;
 root=document.createElement('div');root.id='nethorPageEditorOverlay';root.setAttribute('aria-hidden','true');
 root.innerHTML='<div class="nethorEditorGuide is-x"></div><div class="nethorEditorGuide is-y"></div><div class="nethorEditorMeasurement"></div>';
 document.body.appendChild(root);return root;
}
function hideGuides(){
 const root=document.getElementById('nethorPageEditorOverlay');if(!root)return;
 root.querySelectorAll('.nethorEditorGuide').forEach(line=>line.classList.remove('is-visible'));
}
function metric(el,rect){
 const root=editorOverlay(),r=rect||el.getBoundingClientRect(),b=root.querySelector('.nethorEditorMeasurement');
 b.innerHTML='<span>X '+Math.round(r.left+window.scrollX)+' · Y '+Math.round(r.top+window.scrollY)+'</span><strong>Largeur '+Math.round(r.width)+' × Hauteur '+Math.round(r.height)+' px</strong>';
 b.style.left=Math.max(8,Math.min(innerWidth-225,r.left))+'px';
 b.style.top=Math.max(8,Math.min(innerHeight-48,r.top-38))+'px';
 b.classList.add('is-visible');
}
function selectWidget(el){
 document.querySelectorAll('.nethorPageEditorTarget.is-selected').forEach(x=>{if(x!==el)x.classList.remove('is-selected')});
 el.classList.add('is-selected');metric(el);
}
function snap(el,rect,mode){
 const limit=7;
 const others=[...document.querySelectorAll('.nethorPageEditorTarget')].filter(x=>x!==el&&x.getClientRects().length).map(x=>x.getBoundingClientRect());
 const anchorsX=mode==='resize'?[['right',rect.left+rect.width]]:[['left',rect.left],['center',rect.left+rect.width/2],['right',rect.left+rect.width]];
 const anchorsY=mode==='resize'?[['bottom',rect.top+rect.height]]:[['top',rect.top],['center',rect.top+rect.height/2],['bottom',rect.top+rect.height]];
 let bestX=null,bestY=null;
 for(const other of others){
  const xs=[other.left,other.left+other.width/2,other.right],ys=[other.top,other.top+other.height/2,other.bottom];
  // Keep the magnetic pull local to neighbouring widgets.
  const nearY=rect.top<=other.bottom+160&&rect.top+rect.height>=other.top-160;
  const nearX=rect.left<=other.right+160&&rect.left+rect.width>=other.left-160;
  if(nearY)for(const [,own] of anchorsX)for(const target of xs){
   const diff=target-own;if(Math.abs(diff)<=limit&&(!bestX||Math.abs(diff)<Math.abs(bestX.diff)))bestX={diff,coord:target,other};
  }
  if(nearX)for(const [,own] of anchorsY)for(const target of ys){
   const diff=target-own;if(Math.abs(diff)<=limit&&(!bestY||Math.abs(diff)<Math.abs(bestY.diff)))bestY={diff,coord:target,other};
  }
 }
 return {dx:bestX?.diff||0,dy:bestY?.diff||0,x:bestX,y:bestY};
}
function showGuides(s,rect){
 const root=editorOverlay(),x=root.querySelector('.is-x'),y=root.querySelector('.is-y');
 if(s.x){
  x.style.left=Math.round(s.x.coord)+'px';
  x.style.top=Math.max(0,Math.min(s.x.other.top,rect.top)-9)+'px';
  x.style.height=Math.min(innerHeight,Math.max(s.x.other.bottom,rect.bottom)+9)-Math.max(0,Math.min(s.x.other.top,rect.top)-9)+'px';
  x.classList.add('is-visible');
 }else x.classList.remove('is-visible');
 if(s.y){
  y.style.top=Math.round(s.y.coord)+'px';
  y.style.left=Math.max(0,Math.min(s.y.other.left,rect.left)-9)+'px';
  y.style.width=Math.min(innerWidth,Math.max(s.y.other.right,rect.right)+9)-Math.max(0,Math.min(s.y.other.left,rect.left)-9)+'px';
  y.classList.add('is-visible');
 }else y.classList.remove('is-visible');
}

function start(){
 backupLayouts=JSON.parse(JSON.stringify(layouts));editing=true;dirty=false;
 lastView=viewKey();
 document.documentElement.classList.add('nethorPageEditorOpen');
 document.getElementById('nethorPageEditorButton')?.classList.add('is-active');
 bar();editorOverlay();render();
}
function finish(cancel){
 editing=false;interaction=null;
 document.getElementById('nethorPageEditorOverlay')?.remove();
 document.documentElement.classList.remove('nethorPageEditorOpen');
 document.getElementById('nethorPageEditorBar')?.remove();
 document.getElementById('nethorPageEditorButton')?.classList.remove('is-active');
 document.querySelectorAll('.nethorPageEditorHandle').forEach(x=>x.remove());
 document.querySelectorAll('.nethorPageEditorTarget').forEach(x=>{
  x.classList.remove('nethorPageEditorTarget','is-selected');
  x.removeAttribute('data-nethor-editor-label');x.onpointerdown=null;
 });
 if(cancel)layouts=backupLayouts||layouts;
 document.querySelectorAll('[data-nethor-editor-key]').forEach(el=>clearEditorStyle(el));
 apply();dirty=false;backupLayouts=null;
}
function read(el){
 let x=0,y=0;const t=getComputedStyle(el).transform;
 if(t&&t!=='none'){try{const m=new DOMMatrix(t);x=m.m41;y=m.m42}catch(_){}}
 const bounded=bounds(el,x,y);
 el.style.transform='translate3d('+bounded.x+'px,'+bounded.y+'px,0)';
 const r=el.getBoundingClientRect();
 map()[el.dataset.nethorEditorKey]={
  x:bounded.x,y:bounded.y,width:Math.round(r.width),height:Math.round(r.height),cw:contentWidth()
 };
 dirty=true;
}
function down(e){
 if(!editing||e.button!==0)return;
 const el=e.currentTarget;
 if(e.target.classList.contains('nethorPageEditorHandle')){resize(el,e);return}
 e.preventDefault();e.stopPropagation();
 interaction=el;selectWidget(el);hideGuides();
 const initial=el.getBoundingClientRect(),sx=e.clientX,sy=e.clientY;
 let bx=0,by=0;const t=getComputedStyle(el).transform;
 if(t&&t!=='none'){const m=new DOMMatrix(t);bx=m.m41;by=m.m42}
 const move=v=>{
  if(!interaction)return;
  const dx=v.clientX-sx,dy=v.clientY-sy;
  const r={left:initial.left+dx,top:initial.top+dy,width:initial.width,height:initial.height};
  r.right=r.left+r.width;r.bottom=r.top+r.height;
  const snapped=snap(el,r,'move');
  const bounded=bounds(el,bx+dx+snapped.dx,by+dy+snapped.dy);
  el.style.transform='translate3d('+bounded.x+'px,'+bounded.y+'px,0)';
  showGuides(snapped,el.getBoundingClientRect());metric(el);dirty=true;
 };
 const up=()=>{
  document.removeEventListener('pointermove',move);
  document.removeEventListener('pointerup',up);
  document.removeEventListener('pointercancel',up);
  interaction=null;hideGuides();read(el);metric(el);
 };
 document.addEventListener('pointermove',move);
 document.addEventListener('pointerup',up);
 document.addEventListener('pointercancel',up);
}
function resize(el,e){
 e.preventDefault();e.stopPropagation();interaction=el;selectWidget(el);hideGuides();
 const original=el.getBoundingClientRect(),sx=e.clientX,sy=e.clientY,bw=original.width,bh=original.height;
 const move=v=>{
  if(!interaction)return;
  const width=Math.max(120,Math.round(bw+v.clientX-sx)),height=Math.max(60,Math.round(bh+v.clientY-sy));
  const r={left:original.left,top:original.top,width,height};
  r.right=r.left+r.width;r.bottom=r.top+r.height;
  const snapped=snap(el,r,'resize');
  el.style.width='min(100%, '+Math.max(120,width+snapped.dx)+'px)';
  el.style.maxWidth='100%';el.style.boxSizing='border-box';
  el.style.height=Math.max(60,height+snapped.dy)+'px';
  const t=getComputedStyle(el).transform;
  if(t&&t!=='none'){
   const m=new DOMMatrix(t),safe=bounds(el,m.m41,m.m42);
   el.style.transform='translate3d('+safe.x+'px,'+safe.y+'px,0)';
  }
  showGuides(snapped,el.getBoundingClientRect());metric(el);dirty=true;
 };
 const up=()=>{
  document.removeEventListener('pointermove',move);
  document.removeEventListener('pointerup',up);
  document.removeEventListener('pointercancel',up);
  interaction=null;hideGuides();read(el);metric(el);
 };
 document.addEventListener('pointermove',move);
 document.addEventListener('pointerup',up);
 document.addEventListener('pointercancel',up);
}

async function save(){const btn=document.querySelector('.nethorPageEditorBar .save');if(btn)btn.disabled=true;try{const {data,error}=await client.from('app_settings').select('value').eq('key','site_config').maybeSingle();if(error)throw error;const cfg=data?.value&&typeof data.value==='object'?JSON.parse(JSON.stringify(data.value)):{};cfg.page_editor=cfg.page_editor&&typeof cfg.page_editor==='object'?cfg.page_editor:{};cfg.page_editor.layouts=cfg.page_editor.layouts&&typeof cfg.page_editor.layouts==='object'?cfg.page_editor.layouts:{};cfg.page_editor.layouts[pageKey()]=layouts[pageKey()];const {error:e}=await client.from('app_settings').upsert({key:'site_config',value:cfg,updated_by:session.user.id,updated_at:new Date().toISOString()},{onConflict:'key'});if(e)throw e;layouts=cfg.page_editor.layouts;window.NettoSounds?.play?.('success');finish(false)}catch(e){console.error(e);alert('Impossible d’enregistrer la mise en page.');if(btn)btn.disabled=false}}
function watch(){if(interaction)return;clearTimeout(timer);timer=setTimeout(()=>{if(interaction)return;editing?render():apply()},250)}
async function boot(){if(!window.supabase?.createClient)return;try{client=window.supabase.createClient(U,K,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});const {data:{session:s}}=await client.auth.getSession();session=s;if(!session)return;const {data:p}=await client.from('profiles').select('role').eq('id',session.user.id).maybeSingle();if(p?.role!=='admin')return;const {data:setting}=await client.from('app_settings').select('value').eq('key','site_config').maybeSingle();layouts=setting?.value?.page_editor?.layouts||{};ensureUI();apply();observer=new MutationObserver(watch);observer.observe(document.body,{childList:true,subtree:true});window.addEventListener('resize',()=>{cancelAnimationFrame(resizeTick);resizeTick=requestAnimationFrame(()=>{if(interaction)return;if(editing)render();else apply()})},{passive:true});document.addEventListener('click',e=>{if(!editing)return;if(e.target.closest('#nethorPageEditorUI,#nethorPageEditorBar'))return;if(e.target.closest('.nethorPageEditorTarget')){e.preventDefault();e.stopImmediatePropagation()}},true)}catch(e){console.warn('Éditeur Nethor:',e)}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,900),{once:true});else setTimeout(boot,900);
})();