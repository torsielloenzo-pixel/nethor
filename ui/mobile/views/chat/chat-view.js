(function(){
'use strict';

const STYLE_ASSETS=[
 'chat-v2.css?v=30',
 'ui/mobile/chat-layout.css?v=3',
 'ui/mobile/views/chat/chat-view.css?v=2'
];
const SCRIPT_ASSETS=[
 'ui/mobile/chat-layout.js?v=2',
 'chat-v2.js?v=33'
];
const state={
 host:null,
 mounted:false,
 modalFragment:null,
 modalPromise:null,
 scriptPromises:new Map(),
 styleNodes:[],
 previousLayout:null,
 previousPageId:null,
 listScroll:0,
 messageScroll:0,
 routeKey:''
};

function router(){return window.NethorMobileRouter||window.MobileRouter||null}
function services(){return window.NethorMobileServices||window.MobileServices||null}

function ensureStyle(href){
 return new Promise((resolve,reject)=>{
  const existing=document.querySelector('link[data-nethor-chat-view-asset][href="'+href+'"]');
  if(existing){resolve(existing);return}
  const link=document.createElement('link');
  link.rel='stylesheet';link.href=href;link.dataset.nethorChatViewAsset='1';
  link.onload=()=>resolve(link);link.onerror=()=>reject(new Error('Style Chat indisponible : '+href));
  document.head.appendChild(link);state.styleNodes.push(link)
 })
}
function ensureScript(src){
 if(state.scriptPromises.has(src))return state.scriptPromises.get(src);
 const existing=[...document.scripts].find(s=>String(s.getAttribute('src')||'')===src);
 if(existing){const ready=Promise.resolve(existing);state.scriptPromises.set(src,ready);return ready}
 const promise=new Promise((resolve,reject)=>{
  const s=document.createElement('script');s.src=src;s.async=false;s.dataset.nethorChatViewScript='1';
  s.onload=()=>resolve(s);s.onerror=()=>reject(new Error('Script Chat indisponible : '+src));
  document.head.appendChild(s)
 });
 state.scriptPromises.set(src,promise);
 promise.catch(()=>state.scriptPromises.delete(src));
 return promise
}
async function fragment(){
 if(state.modalFragment)return state.modalFragment;
 if(!state.modalPromise){
  state.modalPromise=fetch('ui/shared/chat-modals.html?v=3',{cache:'force-cache'})
   .then(r=>{if(!r.ok)throw new Error('Fragment Chat HTTP '+r.status);return r.text()})
   .then(text=>{state.modalFragment=text;return text})
   .catch(error=>{state.modalPromise=null;throw error})
 }
 return state.modalPromise
}
function routeKey(){try{return new URLSearchParams(location.search).toString()}catch(_){return location.search}}
function setPlatformMarkers(){
 const root=document.documentElement;
 state.previousLayout=root.dataset.nethorPageLayout??null;
 state.previousPageId=root.dataset.nethorPageId??null;
 root.dataset.nethorPageLayout='mobile';
 root.dataset.nethorPageId='chat'
}
function restorePlatformMarkers(){
 const root=document.documentElement;
 if(state.previousLayout===null)delete root.dataset.nethorPageLayout;else root.dataset.nethorPageLayout=state.previousLayout;
 if(state.previousPageId===null)delete root.dataset.nethorPageId;else root.dataset.nethorPageId=state.previousPageId;
 state.previousLayout=null;state.previousPageId=null
}
function cleanupStyles(){for(const node of state.styleNodes){try{node.remove()}catch(_){}}state.styleNodes=[]}
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
  const fragmentPromise=fragment();
  await services()?.ready?.();
  await loadAssets();
  await fragmentPromise;
  const warmed=await window.NethorChatRuntime?.prewarm?.();
  cleanupStyles();
  return warmed!==false
 }catch(error){
  console.warn('[Nethor ChatView] preload',error);
  cleanupStyles();
  return false
 }
}
function errorView(message){
 if(!state.host)return;
 state.host.innerHTML='<div class="nethorChatViewError"><strong>Chat indisponible</strong><span>'+String(message||'Impossible de charger la messagerie.')+'</span><button type="button" data-chat-fallback>Ouvrir la page de secours</button></div>';
 state.host.querySelector('[data-chat-fallback]')?.addEventListener('click',()=>router()?.fallback?.('chat',{reason:'chat-view-error'}))
}
function restoreScroll(){
 requestAnimationFrame(()=>{
  if(!state.mounted)return;
  const list=document.getElementById('conversationList'),messages=document.getElementById('messages');
  if(list&&state.listScroll>0)list.scrollTop=state.listScroll;
  if(messages&&state.messageScroll>0&&state.routeKey===routeKey())messages.scrollTop=Math.min(state.messageScroll,messages.scrollHeight)
 })
}
async function mount(host){
 state.host=host;state.mounted=true;state.routeKey=routeKey();
 host.innerHTML='<div class="nethorChatViewLoading"><span></span><strong>Chargement du Chat…</strong><small>Connexion aux discussions de l’équipe.</small></div>';
 setPlatformMarkers();
 try{
  const preloadPromise=Promise.all([fragment(),loadAssets()]);
  await services()?.ready?.();
  if(!state.mounted)return false;
  const [modals]=await preloadPromise;
  if(!state.mounted)return false;
  const build=window.NethorMobileChatLayout?.build;
  if(typeof build!=='function')throw new Error('Layout Chat Mobile indisponible');
  const layout=build();
  host.innerHTML='<div class="nethorChatView">'+layout.html+modals+'</div>';
  const result=await window.NethorChatRuntime?.mount?.();
  if(!state.mounted)return false;
  if(result===false)return false;
  restoreScroll();
  return true
 }catch(error){
  console.error('[Nethor ChatView] mount',error);
  errorView(error?.message||'Chargement impossible');
  return false
 }
}
async function unmount(){
 if(!state.mounted)return true;
 const list=document.getElementById('conversationList'),messages=document.getElementById('messages');
 state.listScroll=list?.scrollTop||0;state.messageScroll=messages?.scrollTop||0;state.routeKey=routeKey();
 state.mounted=false;
 try{await window.NethorChatRuntime?.unmount?.()}catch(error){console.warn('[Nethor ChatView] runtime unmount',error)}
 cleanupStyles();restorePlatformMarkers();
 document.body.classList.remove('mobileConversationOpen');
 if(state.host)state.host.innerHTML='';
 state.host=null;
 return true
}

const api=Object.freeze({mount,unmount,preload,get mounted(){return state.mounted}});
window.NethorMobileChatView=api;
router()?.register?.('chat',api);
})();