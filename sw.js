const APP_VERSION=415;
const CACHE='netto-tools-v415';
const DEPENDENCY_CACHE='nethor-deps-v1';
const SUPABASE_UMD='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/dist/umd/supabase.min.js';
const HTML5_QRCODE_UMD='https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';
const ZXING_UMD='https://unpkg.com/@zxing/library@0.21.3/umd/index.min.js';
const EXTERNAL_RUNTIME_DEPS=new Set([
 SUPABASE_UMD,
 HTML5_QRCODE_UMD,
 ZXING_UMD,
 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js'
]);
const EXTERNAL_PRECACHE=[SUPABASE_UMD,HTML5_QRCODE_UMD,ZXING_UMD];
const INSTALL_CORE=["./","./index.html","./auth/auth-session.js?v=16","./auth/login-customization.css?v=3","./runtime/admin-login-editor.js?v=6","./runtime/admin-login-editor.css?v=3","./auth/auth-recovery.js?v=1","./auth/auth-update.js?v=1","./auth/auth-login.js?v=4","./stock/stock-runtime.js?v=1","./stock/stock-data.js?v=1","./stock/stock-render.js?v=1","./stock/stock-order.js?v=1","./stock/stock-products.js?v=1","./stock/stock-management.js?v=1","./stock-page-layout.js?v=1","./stock-modals-layout.js?v=1","./login-page-layout.js?v=1","./welcome-animation-host.html","./home.html","./mobile.html","./runtime/sound-runtime.js?v=1","./ui/mobile/mobile-app.css?v=30","./ui/mobile/mobile-themes.css?v=11","./runtime/client-health.js?v=1","./ui/mobile/mobile-offline-store.js?v=1","./ui/mobile/mobile-sync.js?v=4","./ui/mobile/mobile-services.js?v=22","./ui/mobile/mobile-router.js?v=5","./ui/mobile/mobile-shell.js?v=14","./ui/mobile/mobile-app.js?v=41","./ui/mobile/views/home/home-view.css?v=10","./ui/mobile/views/home/home-view.js?v=19","./ui/mobile/views/notifications/notifications-view.css?v=3","./ui/mobile/views/notifications/notifications-view.js?v=5","./ui/mobile/views/user-menu/user-menu-view.css?v=1","./ui/mobile/views/user-menu/user-menu-view.js?v=7","./ui/mobile/views/surveys/surveys-view.js?v=1","./ui/mobile/views/surveys/surveys-view.css?v=1","./ui/mobile/views/profile/profile-view.css?v=5","./ui/mobile/views/profile/profile-view.js?v=6","./ui/mobile/views/settings/settings-view.css?v=2","./ui/mobile/views/settings/settings-view.js?v=4","./ui/mobile/views/notification-settings/notification-settings-view.css?v=1","./ui/mobile/views/notification-settings/notification-settings-view.js?v=1","./ui/mobile/views/report-problem/report-problem-view.css?v=2","./ui/mobile/views/report-problem/report-problem-view.js?v=1","./ui/mobile/views/scanner/scanner-view.js?v=4","./ui/mobile/views/scanner/scanner-view.css?v=2","./ui/mobile/views/scanner/scanner-runtime.js?v=4","./ui/mobile/tool-pages-layout.js?v=5","./ui/mobile/tool-pages-layout.css?v=5","./ui/mobile/views/planning/planning-view.js?v=24","./ui/mobile/views/planning/planning-view.css?v=2","./ui/mobile/views/chat/chat-view.js?v=14","./ui/mobile/views/chat/chat-view.css?v=2","./ui/shared/chat-modals.html?v=3","./ui/mobile/chat-layout.js?v=2","./ui/mobile/chat-layout.css?v=3","./chat-v2.js?v=37","./chat-v2.css?v=30","./chat.html","./ui/shared/planning-shell.html?v=1","./planning-core.css?v=1","./planning-runtime.js?v=21","./planning-runtime.js?v=23","./planning-agenda-v2.css?v=15","./planning-agenda-v2.js?v=26","./ui/mobile/planning-layout.js?v=2","./ui/mobile/planning-layout.css?v=4","./ui/mobile/planning-agenda.css?v=2","./ui/mobile/planning-week-cards.js?v=2","./ui/mobile/planning-week-cards.css?v=2","./ui/mobile/planning-day-cards.js?v=1","./ui/mobile/planning-day-cards.css?v=1","./planning.html","./profile-user-card.js?v=3","./profile-user-card.css?v=1","./runtime/home-base.css?v=1","./runtime/home-passation.css?v=1","./runtime/home-runtime.js?v=16","./runtime/desktop-home-dashboard.js?v=4","./runtime/planning-quick-import.js?v=2","./runtime/planning-quick-import.css?v=2","./ui/desktop/home-dashboard-v3.css?v=6","./ui/desktop/home-layout.js?v=2","./runtime/store-info-widget.css?v=7","./runtime/quick-planning-widget.css?v=9","./user-menu.html","./admin-portal.html","./accounts.html","./articles.html","./scanner.html","./rewards.html","./bakery.html","./fl-assistant.html","./report-problem.html","./notification-settings.html","./settings.html","./profile.html","./ui/mobile/profile-layout.js?v=4","./ui/mobile/profile-layout.css?v=5","./notifications.html","./user-menu-page.css?v=1","./user-menu-page.js?v=3","./manifest.webmanifest","./app-version.json","./platform-resolver.js?v=3","./platform-assets.js?v=4","./platform-navigation.js?v=5","./platform-page-layout.js?v=12","./ui/mobile/user-pages-layout.js?v=3","./profile-ui.css?v=3","./profile-ui.js?v=226","./runtime/page-editor.js?v=3","./runtime/page-editor.css?v=3","./profile-update.js?v=4","./profile-update.css?v=2","./ui/mobile/mobile-shell.css?v=5","./ui/desktop/desktop-shell.css?v=8","./ui/desktop/desktop-shell.js?v=27","./ui/desktop/desktop-sidebar.css?v=9","./ui/desktop/store-google-card.js?v=3","./ui/desktop/store-google-card.css?v=1","./ui/desktop/chat-layout.js?v=3","./ui/desktop/admin-portal-layout.js?v=6","./ui/desktop/admin-portal-layout.css?v=4","./ui/desktop/department-pages-layout.js?v=3","./ui/desktop/rewards-layout.js?v=3","./ui/desktop/stock-layout.js?v=3","./ui/desktop/stock-layout.css?v=3","./design-v2.css?v=3","./design-v3.css?v=3","./design-v4.css?v=9","./operations-widget.css?v=2","./operations-widget.js?v=4","./assets/fl-background.svg","./assets/nethor-mark.svg","./assets/app-icon-v63.svg","./assets/halloween-pumpkin.svg","./assets/halloween-rooftop-cat.webp?v=1","./assets/halloween-opening-pumpkin-v3/loader.js?v=1","./assets/halloween-opening-pumpkin-v3/00.txt?v=1","./assets/halloween-opening-pumpkin-v3/01.txt?v=1","./assets/halloween-opening-pumpkin-v3/02.txt?v=1","./assets/halloween-opening-pumpkin-v3/03.txt?v=1","./assets/halloween-opening-pumpkin-v3/04.txt?v=1","./assets/app-icon-mobile-v74.svg?v=74","./runtime/admin-portal-runtime.css?v=18","./runtime/admin-portal-runtime.js?v=48","./runtime/client-health-admin.js?v=1","./runtime/client-health-admin.css?v=1","./runtime/management-architecture.css?v=5","./assets/app-icon-mobile-v74-maskable.svg?v=74"];
const INSTALL_NETWORK_REFRESH=new Set([
 './profile-ui.js?v=226',
 './profile-update.js?v=4',
 './platform-resolver.js?v=3'
]);
function installAssetReusable(url){
 return /[?&]v=\d+(?:&|$)/.test(String(url||''))&&!INSTALL_NETWORK_REFRESH.has(String(url||''))
}
async function previousCoreResponse(url,oldCaches){
 if(!installAssetReusable(url))return null;
 for(const old of oldCaches){
  try{const hit=await old.match(url);if(hit)return hit}catch(_){}
 }
 return null
}
self.addEventListener('install',e=>{e.waitUntil((async()=>{
 const cache=await caches.open(CACHE);
 const dependencyCache=await caches.open(DEPENDENCY_CACHE);
 const oldNames=(await caches.keys()).filter(k=>/^netto-tools-v\d+$/.test(String(k))&&k!==CACHE);
 const oldCaches=await Promise.all(oldNames.map(name=>caches.open(name)));
 await Promise.allSettled(INSTALL_CORE.map(async url=>{
  const reusable=await previousCoreResponse(url,oldCaches);
  if(reusable){await cache.put(url,reusable.clone());return}
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

const STRICT_NAVIGATION_FILES=new Set(['index.html','mobile.html','home.html','planning.html','chat.html','notifications.html','user-menu.html','profile.html','settings.html','notification-settings.html','report-problem.html','maintenance.html','repair.html','welcome-animation-host.html']);
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

async function purgeNethorCaches({preserveCurrent=false}={}){
 const keys=await caches.keys();
 await Promise.all(keys
  .filter(k=>/^netto-tools-v\d+$/.test(String(k)))
  .filter(k=>!preserveCurrent||k!==CACHE)
  .map(k=>caches.delete(k)))
}
self.addEventListener('message',e=>{
 const type=e.data&&e.data.type;
 if(type==='PURGE_CACHES_AND_SKIP_WAITING'){
  e.waitUntil((async()=>{await purgeNethorCaches({preserveCurrent:true});await self.skipWaiting()})());
  return
 }
 if(type==='PURGE_CACHES'){e.waitUntil(purgeNethorCaches({preserveCurrent:false}));return}
 if(type==='SKIP_WAITING'){self.skipWaiting();return}
 if(type==='WARM_NAVIGATION_ROUTES'){
  const urls=Array.isArray(e.data?.urls)?e.data.urls.slice(0,8):[];
  e.waitUntil(Promise.all(urls.map(async raw=>{
   try{
    const u=new URL(raw,self.registration.scope);
    if(u.origin!==self.location.origin)return;
    const req=new Request(u.href,{method:'GET',credentials:'same-origin'});
    const key=cleanNavigationRequest(req);
    await fetchAndStore(req,key)
   }catch(_){}
  })));
  return
 }
 if(type==='GET_VERSION'&&e.ports&&e.ports[0])e.ports[0].postMessage({version:APP_VERSION,cache:CACHE});
});

