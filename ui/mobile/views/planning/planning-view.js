(function(){
'use strict';

const STYLE_ASSETS=[
 'planning-core.css?v=1',
 'planning-agenda-v2.css?v=15',
 'ui/mobile/planning-agenda.css?v=2',
 'ui/mobile/planning-week-cards.css?v=2',
 'ui/mobile/planning-layout.css?v=4',
 'ui/mobile/views/planning/planning-view.css?v=2',
 'ui/mobile/planning-day-cards.css?v=1'
];
const SCRIPT_ASSETS=[
 'ui/mobile/planning-layout.js?v=2',
 'planning-runtime.js?v=26',
 'ui/mobile/planning-week-cards.js?v=2',
 'ui/mobile/planning-day-cards.js?v=1',
 'planning-agenda-v2.js?v=27'
];
const state={
 host:null,
 mounted:false,
 template:null,
 templatePromise:null,
 scriptPromises:new Map(),
 styleNodes:[],
 scrollTop:0,
 scrollKey:'',
 routeKey:'',
 previousLayout:null,
 previousPageId:null
};

function router(){return window.NethorMobileRouter||window.MobileRouter||null}
function services(){return window.NethorMobileServices||window.MobileServices||null}

function ensureStyle(href){
 return new Promise((resolve,reject)=>{
  const existing=document.querySelector('link[data-nethor-planning-view-asset][href="'+href+'"]');
  if(existing){existing.disabled=false;resolve(existing);return}
  const link=document.createElement('link');
  link.rel='stylesheet';
  link.href=href;
  link.dataset.nethorPlanningViewAsset='1';
  link.onload=()=>resolve(link);
  link.onerror=()=>reject(new Error('Style Planning indisponible : '+href));
  document.head.appendChild(link);
  state.styleNodes.push(link)
 })
}
function ensureScript(src){
 if(state.scriptPromises.has(src))return state.scriptPromises.get(src);
 const existing=[...document.scripts].find(s=>String(s.getAttribute('src')||'')===src);
 if(existing){
  const ready=Promise.resolve(existing);state.scriptPromises.set(src,ready);return ready
 }
 const promise=new Promise((resolve,reject)=>{
  const script=document.createElement('script');
  script.src=src;
  script.async=false;
  script.dataset.nethorPlanningViewScript='1';
  script.onload=()=>resolve(script);
  script.onerror=()=>reject(new Error('Script Planning indisponible : '+src));
  document.head.appendChild(script)
 });
 state.scriptPromises.set(src,promise);
 promise.catch(()=>state.scriptPromises.delete(src));
 return promise
}
async function template(){
 if(state.template)return state.template;
 if(!state.templatePromise){
  state.templatePromise=fetch('ui/shared/planning-shell.html?v=1',{cache:'force-cache'})
   .then(r=>{if(!r.ok)throw new Error('Fragment Planning HTTP '+r.status);return r.text()})
   .then(text=>{state.template=text;return text})
   .catch(error=>{state.templatePromise=null;throw error})
 }
 return state.templatePromise
}
function replaceNode(selector,html){
 const node=state.host?.querySelector(selector);
 if(!node)return;
 if(!html){node.remove();return}
 node.outerHTML=html
}
function applyMobileLayout(){
 const builder=window.NethorMobilePlanningLayout?.build;
 if(typeof builder!=='function')throw new Error('Layout Planning Mobile indisponible');
 const layout=builder();
 replaceNode('[data-nethor-planning-top]',layout.top||'');
 replaceNode('[data-nethor-planning-toolbar]',layout.toolbar||'');
 replaceNode('[data-nethor-planning-source-actions]',layout.sourceActions||'');
 replaceNode('[data-nethor-planning-mobile-actions]',layout.mobileActions||'');
 replaceNode('[data-nethor-planning-mobile-schedule]',layout.mobileSchedule||'')
}
function routeKey(params){
 try{return params?.toString?.()||new URLSearchParams(location.search).toString()}catch(_){return location.search}
}
function hasFocus(params){
 try{return ['rest','leave'].includes(String(params?.get?.('focus')||''))}catch(_){return false}
}
function setPlatformMarkers(){
 const root=document.documentElement;
 state.previousLayout=root.dataset.nethorPageLayout??null;
 state.previousPageId=root.dataset.nethorPageId??null;
 root.dataset.nethorPageLayout='mobile';
 root.dataset.nethorPageId='planning'
}
function restorePlatformMarkers(){
 const root=document.documentElement;
 if(state.previousLayout===null)delete root.dataset.nethorPageLayout;else root.dataset.nethorPageLayout=state.previousLayout;
 if(state.previousPageId===null)delete root.dataset.nethorPageId;else root.dataset.nethorPageId=state.previousPageId;
 state.previousLayout=null;state.previousPageId=null
}
function cleanupStyles(){
 for(const node of state.styleNodes){try{node.remove()}catch(_){}}
 state.styleNodes=[]
}
function suspendStyles(){
 for(const node of state.styleNodes){try{node.disabled=true}catch(_){}}
}
async function loadAssets(){
 await Promise.all(STYLE_ASSETS.map(ensureStyle));
 for(const src of SCRIPT_ASSETS)await ensureScript(src)
}
async function warmAsset(url){
 try{
  const response=await fetch(url,{cache:'force-cache'});
  return !!response?.ok
 }catch(_){return false}
}
async function preload(){
 try{
  const fragmentPromise=template();
  await services()?.ready?.();
  await loadAssets();
  await fragmentPromise;
  const warmed=await window.NethorPlanningRuntime?.prewarm?.();
  suspendStyles();
  return warmed!==false
 }catch(error){
  console.warn('[Nethor PlanningView] preload',error);
  suspendStyles();
  return false
 }
}
function errorView(message){
 if(!state.host)return;
 state.host.innerHTML='<div class="nethorPlanningViewError"><strong>Planning indisponible</strong><span>'+String(message||'Impossible de charger le Planning.')+'</span><button type="button" data-planning-fallback>Ouvrir la page de secours</button></div>';
 state.host.querySelector('[data-planning-fallback]')?.addEventListener('click',()=>router()?.fallback?.('planning',{reason:'planning-view-error'}))
}
async function mount(host,ctx={}){
 state.host=host;state.mounted=true;state.routeKey=routeKey(ctx.params);
 const warm=window.NethorPlanningRuntime?.cached===true&&!!state.template;
 host.innerHTML=warm?'':'<div class="nethorPlanningViewLoading"><span></span><strong>Chargement du Planning…</strong><small>Préparation de la semaine et de l’équipe.</small></div>';
 setPlatformMarkers();
 try{
  const preloadPromise=Promise.all([template(),loadAssets()]);
  await services()?.ready?.();
  if(!state.mounted)return false;
  const [fragment]=await preloadPromise;
  if(!state.mounted)return false;
  host.innerHTML='<div class="nethorPlanningView"><div id="planningApp">'+fragment+'</div></div>';
  applyMobileLayout();
  const mounted=await window.NethorPlanningRuntime?.mount?.();
  if(!state.mounted)return false;
  if(mounted===false)return false;
  // N'afficher l'agenda qu'une fois le dernier import contrôlé.
  window.NethorPlanningAgenda?.mount?.();
  if(state.scrollKey===state.routeKey&&!hasFocus(ctx.params)&&state.scrollTop>0){
   requestAnimationFrame(()=>{if(state.mounted&&state.host)state.host.scrollTop=state.scrollTop})
  }else if(!hasFocus(ctx.params)){
   host.scrollTop=0
  }
  return true
 }catch(error){
  console.error('[Nethor PlanningView] mount',error);
  errorView(error?.message||'Chargement impossible');
  return false
 }
}
async function unmount(){
 if(!state.mounted)return true;
 state.scrollTop=state.host?.scrollTop||0;
 state.scrollKey=state.routeKey;
 state.mounted=false;
 try{await window.NethorPlanningRuntime?.unmount?.()}catch(error){console.warn('[Nethor PlanningView] runtime unmount',error)}
 try{window.NethorPlanningAgenda?.unmount?.()}catch(error){console.warn('[Nethor PlanningView] agenda unmount',error)}
 if(window.NethorPlanningRuntime?.cached===true)suspendStyles();else cleanupStyles();
 restorePlatformMarkers();
 if(state.host)state.host.innerHTML='';
 state.host=null;state.routeKey='';
 return true
}

const api=Object.freeze({mount,unmount,preload,get mounted(){return state.mounted}});
window.NethorMobilePlanningView=api;
router()?.register?.('planning',api);
})();