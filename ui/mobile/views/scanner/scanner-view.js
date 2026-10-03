(function(){
'use strict';

const STYLE_ASSETS=[
 'ui/mobile/views/scanner/scanner-view.css?v=2',
 'ui/mobile/tool-pages-layout.css?v=5'
];
const SCRIPT_ASSETS=[
 'ui/mobile/tool-pages-layout.js?v=5',
 'ui/mobile/views/scanner/scanner-runtime.js?v=4'
];
const state={host:null,mounted:false,styleNodes:[],scriptPromises:new Map(),previousLayout:null,previousPageId:null};

function router(){return window.NethorMobileRouter||window.MobileRouter||null}
function rootShell(){return document.querySelector('[data-mobile-app-shell]')}
function ensureStyle(href){
 return new Promise((resolve,reject)=>{
  const existing=document.querySelector('link[data-nethor-scanner-view-asset][href="'+href+'"]');
  if(existing){existing.disabled=false;resolve(existing);return}
  const link=document.createElement('link');
  link.rel='stylesheet';link.href=href;link.dataset.nethorScannerViewAsset='1';
  link.onload=()=>resolve(link);link.onerror=()=>reject(new Error('Style Scanner indisponible : '+href));
  document.head.appendChild(link);state.styleNodes.push(link)
 })
}
function ensureScript(src){
 if(state.scriptPromises.has(src))return state.scriptPromises.get(src);
 const existing=[...document.scripts].find(s=>String(s.getAttribute('src')||'')===src);
 if(existing){const ready=Promise.resolve(existing);state.scriptPromises.set(src,ready);return ready}
 const promise=new Promise((resolve,reject)=>{
  const s=document.createElement('script');s.src=src;s.async=false;s.dataset.nethorScannerViewScript='1';
  s.onload=()=>resolve(s);s.onerror=()=>reject(new Error('Module Scanner indisponible : '+src));
  document.head.appendChild(s)
 });
 state.scriptPromises.set(src,promise);
 promise.catch(()=>state.scriptPromises.delete(src));
 return promise
}
function setMarkers(){
 const html=document.documentElement;
 state.previousLayout=html.dataset.nethorPageLayout??null;
 state.previousPageId=html.dataset.nethorPageId??null;
 html.dataset.nethorPageLayout='mobile';
 html.dataset.nethorPageId='scanner';
 rootShell()?.classList.add('nethorScannerViewActive')
}
function restoreMarkers(){
 const html=document.documentElement;
 if(state.previousLayout===null)delete html.dataset.nethorPageLayout;else html.dataset.nethorPageLayout=state.previousLayout;
 if(state.previousPageId===null)delete html.dataset.nethorPageId;else html.dataset.nethorPageId=state.previousPageId;
 state.previousLayout=null;state.previousPageId=null;
 rootShell()?.classList.remove('nethorScannerViewActive')
}
function cleanupStyles(){for(const node of state.styleNodes){try{node.remove()}catch(_){}}state.styleNodes=[]}
function errorView(message){
 if(!state.host)return;
 state.host.innerHTML='<div style="min-height:100%;display:grid;place-items:center;padding:24px;text-align:center"><div><strong>Scanner indisponible</strong><p style="color:#7d848d;font-size:12px">'+String(message||'Impossible de préparer la caméra.')+'</p><button type="button" data-scanner-fallback style="min-height:42px;border:0;border-radius:11px;padding:8px 12px;background:#ef5a2f;color:white;font-weight:850">Ouvrir la page de secours</button></div></div>';
 state.host.querySelector('[data-scanner-fallback]')?.addEventListener('click',()=>router()?.fallback?.('scanner',{reason:'scanner-view-error'}))
}
async function loadAssets(){
 await Promise.all(STYLE_ASSETS.map(ensureStyle));
 for(const src of SCRIPT_ASSETS)await ensureScript(src)
}
async function mount(host){
 state.host=host;state.mounted=true;setMarkers();
 host.innerHTML='<div style="min-height:100%;display:grid;place-items:center;color:#858b93">Préparation du Scanner…</div>';
 try{
  await loadAssets();
  if(!state.mounted)return false;
  const layout=window.NethorMobileToolPagesLayout?.build?.('scanner');
  if(!layout?.html)throw new Error('Layout Scanner Mobile indisponible');
  host.innerHTML=layout.html;
  const runtime=window.NethorScannerRuntime;
  if(!runtime?.mount)throw new Error('Moteur Scanner indisponible');
  await runtime.mount();
  return true
 }catch(error){
  console.error('[Nethor ScannerView] mount',error);
  errorView(error?.message||'Chargement impossible');
  return false
 }
}
async function unmount(){
 if(!state.mounted)return true;
 state.mounted=false;
 try{await window.NethorScannerRuntime?.unmount?.()}catch(error){console.warn('[Nethor ScannerView] unmount',error)}
 document.body.classList.remove('scannerResultOpen');
 cleanupStyles();restoreMarkers();
 if(state.host)state.host.innerHTML='';
 state.host=null;
 return true
}
const api=Object.freeze({mount,unmount,get mounted(){return state.mounted}});
window.NethorMobileScannerView=api;
router()?.register?.('scanner',api);
})();