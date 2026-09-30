const APP_VERSION=259;
const CACHE='netto-tools-v259';
const DEPENDENCY_CACHE='nethor-deps-v1';
const SUPABASE_UMD='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/dist/umd/supabase.min.js';
const HTML5_QRCODE_UMD='https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';
const EXTERNAL_RUNTIME_DEPS=new Set([
 SUPABASE_UMD,
 HTML5_QRCODE_UMD,
 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js'
]);
const EXTERNAL_PRECACHE=[SUPABASE_UMD,HTML5_QRCODE_UMD];
const INSTALL_CORE=["./","./index.html","./auth/auth-session.js?v=1","./auth/auth-recovery.js?v=1","./auth/auth-update.js?v=1","./auth/auth-login.js?v=1","./stock/stock-runtime.js?v=1","./stock/stock-data.js?v=1","./stock/stock-render.js?v=1","./stock/stock-order.js?v=1","./stock/stock-products.js?v=1","./stock/stock-management.js?v=1","./stock-page-layout.js?v=1","./stock-modals-layout.js?v=1","./login-page-layout.js?v=1","./home.html","./runtime/home-base.css?v=1","./runtime/home-passation.css?v=1","./runtime/home-runtime.js?v=2","./user-menu.html","./user-menu-page.css?v=1","./user-menu-page.js?v=2","./manifest.webmanifest","./app-version.json","./platform-resolver.js?v=3","./platform-assets.js?v=1","./platform-navigation.js?v=1","./platform-page-layout.js?v=12","./profile-ui.css?v=3","./profile-ui.js?v=208","./design-v2.css?v=3","./design-v3.css?v=3","./design-v4.css?v=9","./operations-widget.css?v=2","./operations-widget.js?v=2","./assets/nethor-mark.svg","./assets/app-icon-v63.svg","./assets/app-icon-mobile-v71.svg?v=72"];
self.addEventListener('install',e=>{e.waitUntil((async()=>{
 const cache=await caches.open(CACHE);
 const dependencyCache=await caches.open(DEPENDENCY_CACHE);
 await Promise.allSettled(INSTALL_CORE.map(async url=>{
  const response=await fetch(url,{cache:'reload'});
  if(response&&response.ok)await cache.put(url,response.clone())
 }));
 await Promise.allSettled(EXTERNAL_PRECACHE.map(async url=>{
  if(await dependencyCache.match(url))return;
  const response=await fetch(url,{mode:'no-cors',cache:'reload'});
  if(response)await dependencyCache.put(url,response.clone())
 }))
})())});
self.addEventListener('activate',e=>{e.waitUntil((async()=>{
 const keys=await caches.keys();
 await Promise.all(keys.filter(k=>/^netto-tools-v\d+$/.test(k)&&k!==CACHE).map(k=>caches.delete(k)));
 const dependencyCache=await caches.open(DEPENDENCY_CACHE);
 const dependencyKeys=await dependencyCache.keys();
 await Promise.all(dependencyKeys.filter(request=>!EXTERNAL_RUNTIME_DEPS.has(request.url)).map(request=>dependencyCache.delete(request)));
 await self.registration.getNotifications().then(list=>{list.forEach(n=>n.close())}).catch(()=>{});
 await self.clients.claim()
})())});
async function networkFirst(request,fallback){
 try{
  const response=await fetch(request,{cache:'no-cache'});
  if(response&&response.ok){const copy=response.clone();caches.open(CACHE).then(c=>c.put(request,copy)).catch(()=>{})}
  return response
 }catch(_){
  return (await stableCacheMatch(request))||(fallback?await stableCacheMatch(fallback):undefined)||Response.error()
 }
}
function cleanNavigationRequest(request){
 const u=new URL(request.url);u.search='';u.hash='';
 return new Request(u.href,{method:'GET'})
}
async function stableCacheMatch(request,options){
 const current=await caches.open(CACHE);
 return (await current.match(request,options))||null
}
async function fetchAndStore(request,cacheKey=request){
 try{
  const response=await fetch(request,{cache:'no-cache'});
  if(response&&response.ok){
   const cache=await caches.open(CACHE);
   await cache.put(cacheKey,response.clone())
  }
  return response
 }catch(_){return null}
}
async function navigationFromCache(request,fallback){
 const key=cleanNavigationRequest(request);
 const cached=await stableCacheMatch(key,{ignoreSearch:true});
 if(cached){fetchAndStore(request,key).catch(()=>{});return cached}
 const fresh=await fetchAndStore(request,key);
 if(fresh)return fresh;
 return (fallback?await stableCacheMatch(fallback,{ignoreSearch:true}):null)||Response.error()
}
async function navigationNetworkFirst(request,fallback){
 const key=cleanNavigationRequest(request);
 const fresh=await fetchAndStore(request,key);
 if(fresh)return fresh;
 return (await stableCacheMatch(key,{ignoreSearch:true}))||(fallback?await stableCacheMatch(fallback,{ignoreSearch:true}):null)||Response.error()
}
async function staticFromCache(request){
 const cached=await stableCacheMatch(request);
 if(cached)return cached;
 return (await fetchAndStore(request))||Response.error()
}
async function externalDependencyFromCache(request){
 const cache=await caches.open(DEPENDENCY_CACHE);
 const cached=await cache.match(request);
 if(cached){
  fetch(request,{cache:'no-cache'}).then(response=>{
   if(response)cache.put(request,response.clone()).catch(()=>{})
  }).catch(()=>{});
  return cached
 }
 try{
  const response=await fetch(request,{cache:'no-cache'});
  if(response)await cache.put(request,response.clone());
  return response
 }catch(_){return Response.error()}
}

const STRICT_NAVIGATION_FILES=new Set(['index.html','maintenance.html','repair.html']);
function navigationFile(url){
 const path=String(url?.pathname||'');
 return (path.split('/').pop()||'index.html').toLowerCase()
}
self.addEventListener('fetch',e=>{
 const u=new URL(e.request.url);
 if(e.request.method!=='GET')return;
 if(EXTERNAL_RUNTIME_DEPS.has(e.request.url)){
  e.respondWith(externalDependencyFromCache(e.request));
  return
 }
 if(u.origin!==location.origin)return;
 if(e.request.mode==='navigate'){
  const file=navigationFile(u);
  if(file==='repair.html'){
   e.respondWith(fetch(e.request,{cache:'no-store'}).catch(()=>Response.error()));
   return;
  }
  const fallback=file==='settings.html'?'./settings.html':'./home.html';
  if(STRICT_NAVIGATION_FILES.has(file)){
   e.respondWith(navigationNetworkFirst(e.request,fallback));
   return;
  }
  e.respondWith(navigationFromCache(e.request,fallback));
  return;
 }
 if(u.pathname.endsWith('/app-version.json')){
  e.respondWith(networkFirst(e.request));
  return;
 }
 if(/\.(?:js|css|svg|png|webp|jpe?g|gif|webmanifest)$/i.test(u.pathname)){
  e.respondWith(staticFromCache(e.request));
  return;
 }
 e.respondWith(stableCacheMatch(e.request).then(cached=>cached||networkFirst(e.request)));
});


self.addEventListener('push',e=>{
 let data={};
 try{data=e.data?e.data.json():{}}catch(_){data={body:e.data?.text?.()||''}}
 const title=data.title||'Notification';
 const options={
   body:data.body||'',
   icon:'./assets/app-icon-v63.svg',
   badge:'./assets/app-icon-v63.svg',
   data:{url:data.url||'home.html'},
   tag:data.kind==='import_new'?'planning-published':data.kind==='manual_edit'?'planning-modified':undefined
 };
 e.waitUntil(self.registration.showNotification(title,options));
});

self.addEventListener('notificationclick',e=>{
 e.notification.close();
 const rel=e.notification?.data?.url||'home.html';
 const target=new URL(rel,self.registration.scope).href;
 e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
   for(const client of list){
     if(client.url===target&&'focus' in client)return client.focus();
   }
   for(const client of list){
     if('navigate' in client&&'focus' in client)return client.navigate(target).then(()=>client.focus());
   }
   return self.clients.openWindow?self.clients.openWindow(target):undefined;
 }));
});

async function purgeNethorCaches(){
 const keys=await caches.keys();
 await Promise.all(keys.filter(k=>/^netto-tools-v\d+$/.test(String(k))).map(k=>caches.delete(k)))
}
self.addEventListener('message',e=>{
 const type=e.data&&e.data.type;
 if(type==='PURGE_CACHES_AND_SKIP_WAITING'){
  e.waitUntil((async()=>{await purgeNethorCaches();await self.skipWaiting()})());
  return
 }
 if(type==='PURGE_CACHES'){e.waitUntil(purgeNethorCaches());return}
 if(type==='SKIP_WAITING'){self.skipWaiting();return}
 if(type==='GET_VERSION'&&e.ports&&e.ports[0])e.ports[0].postMessage({version:APP_VERSION,cache:CACHE});
});

