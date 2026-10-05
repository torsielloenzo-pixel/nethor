(function(){
'use strict';

const ROOT=document.documentElement;
const SESSION_KEY='nethorPlatformResolvedV1';
const OVERRIDE_KEY='nethorPlatformOverrideV1';
const VALID=new Set(['desktop','mobile']);

function params(){
 try{return new URLSearchParams(location.search)}catch(_){return new URLSearchParams()}
}
function isPreviewRequest(){
 return params().get('mobile_preview')==='1'
}
function queryOverride(){
 const value=String(params().get('nethor_platform')||'').toLowerCase();
 return VALID.has(value)?value:''
}
function storedOverride(){
 try{
  const value=String(localStorage.getItem(OVERRIDE_KEY)||'').toLowerCase();
  return VALID.has(value)?value:''
 }catch(_){return''}
}
function sessionPlatform(){
 try{
  const value=String(sessionStorage.getItem(SESSION_KEY)||'').toLowerCase();
  return VALID.has(value)?value:''
 }catch(_){return''}
}
function detectAutomatic(){
 try{
  if(navigator.userAgentData?.mobile===true)return'mobile';
  const ua=String(navigator.userAgent||'');
  if(/iPhone|iPod|iPad|Android|Windows Phone|webOS|BlackBerry|Opera Mini|IEMobile/i.test(ua))return'mobile';
  if(String(navigator.platform||'')==='MacIntel'&&Number(navigator.maxTouchPoints||0)>1)return'mobile';
  const coarse=window.matchMedia?.('(hover:none) and (pointer:coarse)')?.matches===true;
  const touch=Number(navigator.maxTouchPoints||0)>0;
  const sw=Number(screen.width)||0,sh=Number(screen.height)||0;
  const shortSide=sw&&sh?Math.min(sw,sh):0;
  if(coarse&&touch&&shortSide>0&&shortSide<=768)return'mobile'
 }catch(_){}
 return'desktop'
}
function pageId(){
 const file=(location.pathname.split('/').pop()||'home.html').toLowerCase();
 return file.replace(/\.html$/,'')||'home'
}
function resolve(){
 if(isPreviewRequest())return{kind:'mobile-preview',source:'preview'};
 const query=queryOverride();
 if(query){
  try{sessionStorage.setItem(SESSION_KEY,query)}catch(_){}
  return{kind:query,source:'query'}
 }
 const override=storedOverride();
 if(override)return{kind:override,source:'override'};
 const session=sessionPlatform();
 if(session)return{kind:session,source:'session'};
 const detected=detectAutomatic();
 try{sessionStorage.setItem(SESSION_KEY,detected)}catch(_){}
 return{kind:detected,source:'auto'}
}
function apply(state){
 const kind=state.kind;
 ROOT.dataset.nethorPlatform=kind;
 ROOT.dataset.nethorPlatformSource=state.source;
 ROOT.dataset.nethorPage=pageId();
 ROOT.classList.toggle('nethorPlatformDesktop',kind==='desktop');
 ROOT.classList.toggle('nethorPlatformMobile',kind==='mobile'||kind==='mobile-preview');
 ROOT.classList.toggle('nethorPlatformPreview',kind==='mobile-preview');
 return state
}

function installIsolationStyle(){
 if(document.getElementById('nethorPlatformIsolation'))return;
 const style=document.createElement('style');
 style.id='nethorPlatformIsolation';
 style.textContent=`
 html[data-nethor-platform="desktop"] .nettoMobileQuickBar,
 html[data-nethor-platform="desktop"] .nettoMobileUserMenu,
 html[data-nethor-platform="desktop"] .profileMobileTop,
 html[data-nethor-platform="desktop"] .settingsMobileTop,
 html[data-nethor-platform="desktop"] .flMobileBack,
 html[data-nethor-platform="desktop"] .mobileBack,
 html[data-nethor-platform="desktop"] .mobileNavBackdrop{display:none!important}
 html[data-nethor-platform="desktop"][data-nethor-page="profile"] body>header,
 html[data-nethor-platform="desktop"][data-nethor-page="settings"] body>header{display:flex!important}
 html[data-nethor-platform="desktop"] body.nettoHasMobileBar{padding-bottom:0!important}
 html[data-nethor-platform="mobile"] .nettoMobileQuickBar,
 html[data-nethor-platform="mobile-preview"] .nettoMobileQuickBar{display:grid}
 `;
 (document.head||document.documentElement).appendChild(style)
}

function mobileMediaCondition(text){
 const value=String(text||'').toLowerCase();
 if(/pointer\s*:\s*coarse|hover\s*:\s*none/.test(value))return true;
 const matches=[...value.matchAll(/max-width\s*:\s*([\d.]+)px/g)];
 return matches.some(m=>Number(m[1])<=900)
}
function disableDesktopMobileMediaRules(rules){
 if(!rules)return;
 for(const rule of Array.from(rules)){
  try{
   if(rule.media&&rule.cssRules&&mobileMediaCondition(rule.media.mediaText)){
    rule.media.mediaText='not all';
    continue
   }
   if(rule.cssRules)disableDesktopMobileMediaRules(rule.cssRules)
  }catch(_){}
 }
}
function enforceDesktopMediaIsolation(){
 if(state.kind!=='desktop')return;
 let scanQueued=false;
 const scan=()=>{
  if(state.kind!=='desktop')return;
  for(const sheet of Array.from(document.styleSheets)){
   try{disableDesktopMobileMediaRules(sheet.cssRules)}catch(_){}
  }
  ROOT.dataset.nethorDesktopMedia='isolated'
 };
 const queueScan=()=>{
  if(scanQueued||state.kind!=='desktop')return;
  scanQueued=true;
  const run=()=>{scanQueued=false;scan()};
  if('requestIdleCallback' in window)requestIdleCallback(run,{timeout:180});
  else requestAnimationFrame(run)
 };
 scan();
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',queueScan,{once:true});
 window.addEventListener('load',queueScan,{once:true});
 if(document.head&&typeof MutationObserver!=='undefined'){
  const observer=new MutationObserver(mutations=>{
   const relevant=mutations.some(m=>{
    const targetTag=String(m.target?.tagName||'').toUpperCase();
    if(targetTag==='STYLE')return true;
    return [...m.addedNodes].some(node=>{
     if(node.nodeType!==1)return false;
     const tag=String(node.tagName||'').toUpperCase();
     return tag==='STYLE'||(tag==='LINK'&&String(node.rel||'').toLowerCase()==='stylesheet')||!!node.querySelector?.('style,link[rel="stylesheet"]')
    })
   });
   if(relevant)queueScan()
  });
  observer.observe(document.head,{childList:true,subtree:true});
  window.addEventListener('pagehide',()=>observer.disconnect(),{once:true})
 }
}

function shellKindForLink(link){
 if(!link||String(link.tagName||'').toUpperCase()!=='LINK')return'';
 const explicit=String(link.dataset?.nethorShell||'').toLowerCase();
 if(explicit==='desktop'||explicit==='mobile')return explicit;
 const href=String(link.getAttribute?.('href')||'');
 if(/ui\/desktop\/desktop-shell\.css/i.test(href))return'desktop';
 if(/ui\/mobile\/mobile-shell\.css/i.test(href))return'mobile';
 return''
}
function syncPlatformShellStyles(kind){
 const active=kind==='desktop'?'desktop':'mobile';
 document.querySelectorAll('link[rel="stylesheet"]').forEach(link=>{
  const shell=shellKindForLink(link);if(!shell)return;
  link.media=shell===active?'all':'not all';
  link.dataset.nethorShellActive=shell===active?'1':'0'
 })
}
function observePlatformShellStyles(){
 if(!document.head||typeof MutationObserver==='undefined')return;
 const sync=()=>syncPlatformShellStyles(state.kind);
 const observer=new MutationObserver(mutations=>{
  if(mutations.some(m=>[...m.addedNodes].some(node=>node.nodeType===1&&(node.matches?.('link[rel="stylesheet"]')||node.querySelector?.('link[rel="stylesheet"]')))))queueMicrotask(sync)
 });
 observer.observe(document.head,{childList:true,subtree:true});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',sync,{once:true});
 window.addEventListener('load',sync,{once:true});
 window.addEventListener('pagehide',()=>observer.disconnect(),{once:true})
}

let state=apply(resolve());
installIsolationStyle();
syncPlatformShellStyles(state.kind);
observePlatformShellStyles();
enforceDesktopMediaIsolation();

const api=Object.freeze({
 current:()=>state.kind,
 source:()=>state.source,
 isDesktop:()=>state.kind==='desktop',
 isMobile:()=>state.kind==='mobile'||state.kind==='mobile-preview',
 isPreview:()=>state.kind==='mobile-preview',
 page:()=>ROOT.dataset.nethorPage||pageId(),
 setOverride(mode){
  const value=String(mode||'').toLowerCase();
  try{
   if(VALID.has(value))localStorage.setItem(OVERRIDE_KEY,value);
   else localStorage.removeItem(OVERRIDE_KEY);
   sessionStorage.removeItem(SESSION_KEY)
  }catch(_){}
  location.reload()
 },
 clearOverride(){
  try{
   localStorage.removeItem(OVERRIDE_KEY);
   sessionStorage.removeItem(SESSION_KEY)
  }catch(_){}
  location.reload()
 },
 describe:()=>({platform:state.kind,source:state.source,page:ROOT.dataset.nethorPage||pageId()})
});
window.NethorPlatform=api;

try{window.dispatchEvent(new CustomEvent('nethor:platform',{detail:api.describe()}))}catch(_){}
})();
