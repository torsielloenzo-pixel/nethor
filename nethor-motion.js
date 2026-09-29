(function(){
'use strict';

const VERSION='2';
const MOBILE_QUERY='(max-width:900px), (pointer:coarse)';
const REDUCED_QUERY='(prefers-reduced-motion:reduce)';
const ROUTE_STATE_KEY='nethorMotionRoute';
const ROUTE_DELAY=135;
let routeLocked=false;
let planningPending='';
let planningObserver=null;
let planningMount=null;
let contentTimer=0;

function mobile(){
 try{return new URLSearchParams(location.search).get('mobile_preview')==='1'||window.matchMedia(MOBILE_QUERY).matches}catch(_){return innerWidth<=900}
}
function reduced(){try{return window.matchMedia(REDUCED_QUERY).matches}catch(_){return false}}
function primaryRoot(){
 return document.querySelector('[data-nethor-motion-root],body>main,#site>main,main,.npPage,.scannerPage,.reportPage,.settingsPage')||null
}
function routeState(){
 try{return JSON.parse(sessionStorage.getItem(ROUTE_STATE_KEY)||'null')}catch(_){return null}
}
function setRouteState(direction,url){
 try{sessionStorage.setItem(ROUTE_STATE_KEY,JSON.stringify({direction,url:String(url||''),at:Date.now()}))}catch(_){ }
}
function clearRouteState(){try{sessionStorage.removeItem(ROUTE_STATE_KEY)}catch(_){}}
function isBackForward(){
 try{return performance.getEntriesByType('navigation')?.[0]?.type==='back_forward'}catch(_){return false}
}
function animateClass(el,cls,ms=360){
 if(!el||reduced())return;
 el.classList.remove(cls);void el.offsetWidth;el.classList.add(cls);
 setTimeout(()=>el.classList.remove(cls),ms)
}
function applyEntryMotion(){
 if(!mobile()||reduced())return;
 const root=primaryRoot();if(!root)return;
 root.classList.add('nm-page-root');
 const st=routeState(),fresh=st&&Date.now()-Number(st.at||0)<2500;
 const direction=isBackForward()?'back':fresh&&st.direction==='back'?'back':'forward';
 animateClass(root,direction==='back'?'nm-route-enter-back':'nm-route-enter-forward',360);
 clearRouteState()
}
function normalizeInternalUrl(raw){
 try{
  const u=new URL(raw,location.href);
  if(u.origin!==location.origin)return null;
  if(!/\.html$/i.test(u.pathname)&&!u.pathname.endsWith('/'))return null;
  if(u.pathname===location.pathname&&u.search===location.search&&u.hash===location.hash)return null;
  return u
 }catch(_){return null}
}
function navigate(raw,direction='forward'){
 const u=normalizeInternalUrl(raw);
 if(!u){location.href=raw;return}
 if(routeLocked)return;
 if(!mobile()||reduced()){
  setRouteState(direction,u.href);location.href=u.href;return
 }
 routeLocked=true;
 setRouteState(direction,u.href);
 const root=primaryRoot();
 if(root){
  root.classList.add('nm-page-root');
  animateClass(root,direction==='back'?'nm-route-exit-back':'nm-route-exit-forward',240)
 }
 document.documentElement.classList.add('nm-route-leaving');
 setTimeout(()=>{location.href=u.href},ROUTE_DELAY)
}
function simpleInlineRoute(el){
 const code=String(el?.getAttribute?.('onclick')||'').trim();
 const m=code.match(/^\s*(?:window\.)?location(?:\.href)?\s*=\s*(['"])([^'"]+)\1\s*;?\s*$/i);
 return m?m[2]:''
}
function routeClickCapture(e){
 if(!mobile()||reduced()||e.defaultPrevented||e.button>0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
 const target=e.target?.closest?.('a[href],button[data-url],button[onclick]');if(!target)return;
 if(target.closest('[data-nm-no-route]')||target.hasAttribute('download')||target.getAttribute('target'))return;
 let raw='';
 if(target.matches('a[href]'))raw=target.getAttribute('href')||'';
 else if(target.dataset?.url)raw=target.dataset.url;
 else raw=simpleInlineRoute(target);
 if(!raw||raw.startsWith('#')||raw.startsWith('javascript:'))return;
 const u=normalizeInternalUrl(raw);if(!u)return;
 e.preventDefault();e.stopImmediatePropagation();
 navigate(u.href,'forward')
}

function animatePlanning(kind){
 const mount=document.getElementById('agendaMount');if(!mount)return;
 const cls=kind==='back'?'nm-planning-in-back':kind==='forward'?'nm-planning-in-forward':'nm-planning-mode';
 animateClass(mount,cls,340)
}
function bindPlanningMount(){
 const mount=document.getElementById('agendaMount');
 if(!mount||mount===planningMount)return;
 planningObserver?.disconnect?.();planningMount=mount;
 planningObserver=new MutationObserver(()=>{
  if(!planningPending)return;
  const kind=planningPending;planningPending='';
  requestAnimationFrame(()=>animatePlanning(kind))
 });
 planningObserver.observe(mount,{childList:true,subtree:true,characterData:true})
}
function planningIntent(e){
 const arrow=e.target?.closest?.('.mobilePlanningSelectorArrow[data-move]');
 if(arrow){planningPending=Number(arrow.dataset.move)<0?'back':'forward';bindPlanningMount();return}
 const mode=e.target?.closest?.('.mobileAgendaModeBtn');
 if(mode){if(mode.id==='mobileAgendaCalendarBtn'){planningPending='';return}planningPending='mode';bindPlanningMount();return}
 const today=e.target?.closest?.('#agendaTodayBtn');
 if(today){planningPending='mode';bindPlanningMount()}
}
function setupPlanningMotion(){
 if(!mobile())return;
 bindPlanningMount();
 const bodyObs=new MutationObserver(()=>bindPlanningMount());
 bodyObs.observe(document.documentElement,{childList:true,subtree:true})
}

function contentRoots(){
 const path=(location.pathname.split('/').pop()||'home.html').toLowerCase();
 if(path==='articles.html')return [...document.querySelectorAll('#grid')];
 if(path==='bakery.html')return [...document.querySelectorAll('#grid,.grid')].slice(0,8);
 if(path==='index.html')return [...document.querySelectorAll('.category .grid,.quickStockList,.consultGrid,.stockGrid')].slice(0,18);
 if(path==='admin-portal.html')return [...document.querySelectorAll('.adminList,.problemList,.logList,.items,.itemList')].slice(0,10);
 return []
}
function refreshContent(){
 if(!mobile()||reduced())return;
 for(const el of contentRoots())animateClass(el,'nm-content-refresh',280)
}
function scheduleContentRefresh(){clearTimeout(contentTimer);contentTimer=setTimeout(refreshContent,75)}
function contentIntent(e){
 if(!mobile())return;
 const control=e.target?.closest?.('.filter,[data-filter],.stockModeBtn,.quickCat,[data-sort],.sortBtn,.counter button,.quickControls button,.qty button');
 if(!control)return;
 if(control.closest('.counter,.quickControls,.qty')){
  const card=control.closest('.card,.quickStockRow,.consultCard,.row,.productCard');
  if(card)animateClass(card,'nm-content-bump',300)
 }
 scheduleContentRefresh()
}
function inputIntent(e){
 if(!mobile())return;
 if(e.target?.matches?.('input[type="search"],.search,.searchBox input'))scheduleContentRefresh()
}

function enhanceExistingFeedback(){
 const obs=new MutationObserver(muts=>{
  if(!mobile()||reduced())return;
  for(const m of muts){
   if(m.type!=='attributes'||m.attributeName!=='class')continue;
   const el=m.target;
   if(el.classList?.contains('show')&&(el.matches?.('.planningToast,.toast,.nettoUpdateToast')))animateClass(el,'nm-feedback-pop',420)
  }
 });
 obs.observe(document.documentElement,{attributes:true,subtree:true,attributeFilter:['class']})
}

function makeToast(message,detail=''){
 if(!document.body)return;
 let host=document.getElementById('nethorMotionToastHost');
 if(!host){host=document.createElement('div');host.id='nethorMotionToastHost';host.className='nm-toast-host';document.body.appendChild(host)}
 const toast=document.createElement('div');toast.className='nm-toast';
 toast.innerHTML='<span class="nm-toast-icon">✓</span><span><strong></strong><small></small></span>';
 toast.querySelector('strong').textContent=String(message||'Terminé');
 const small=toast.querySelector('small');small.textContent=String(detail||'');if(!detail)small.hidden=true;
 host.replaceChildren(toast);setTimeout(()=>toast.classList.add('leaving'),2400);setTimeout(()=>toast.remove(),2700)
}

function boot(){
 document.documentElement.dataset.nethorMotion=VERSION;
 if(!mobile())return;
 document.documentElement.classList.add('nm-motion-active');
 applyEntryMotion();setupPlanningMotion();enhanceExistingFeedback()
}

document.addEventListener('click',routeClickCapture,true);
document.addEventListener('pointerdown',planningIntent,true);
document.addEventListener('click',contentIntent,true);
document.addEventListener('input',inputIntent,true);
window.addEventListener('pageshow',e=>{if(e.persisted)requestAnimationFrame(applyEntryMotion)});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();

window.NethorMotion=Object.freeze({version:VERSION,navigate,toast:makeToast,refreshContent,animatePlanning});
})();
