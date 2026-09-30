const APP_VERSION=242;
const CACHE='netto-tools-v242';
const CORE=['./rewards.html','./rewards.css?v=2','./rewards.js?v=6','./reward-profile.js?v=2','./','./index.html','./auth/auth-session.js?v=1','./auth/auth-recovery.js?v=1','./auth/auth-update.js?v=1','./auth/auth-login.js?v=1','./stock/stock-runtime.js?v=1','./stock/stock-data.js?v=1','./stock/stock-render.js?v=1','./stock/stock-order.js?v=1','./stock/stock-products.js?v=1','./stock/stock-management.js?v=1','./stock-page-layout.js?v=1','./stock-modals-layout.js?v=1','./ui/desktop/stock-modals-layout.css?v=2','./ui/mobile/stock-modals-layout.css?v=2','./ui/desktop/stock-modals-layout.js?v=1','./ui/mobile/stock-modals-layout.js?v=1','./ui/desktop/stock-layout.css?v=2','./ui/mobile/stock-layout.css?v=2','./ui/desktop/stock-layout.js?v=1','./ui/mobile/stock-layout.js?v=1','./login-page-layout.js?v=1','./ui/desktop/login-layout.css?v=1','./ui/mobile/login-layout.css?v=1','./ui/desktop/login-layout.js?v=1','./ui/mobile/login-layout.js?v=1','./home.html','./user-menu.html','./user-menu-page.css?v=1','./user-menu-page.js?v=1','./maintenance.html','./maintenance-page-layout.js?v=1','./ui/desktop/maintenance-layout.css?v=1','./ui/mobile/maintenance-layout.css?v=1','./ui/desktop/maintenance-layout.js?v=1','./ui/mobile/maintenance-layout.js?v=1','./articles.html','./bakery.html','./planning.html','./planning-agenda-v2.css?v=15','./planning-agenda-v2.js?v=18','./planning-preferences-v2.js?v=1','./chat.html','./notifications.html','./notification-settings.html','./report-problem.html','./chat-v2.css?v=26','./chat-v2.js?v=26','./profile.html','./settings.html','./accounts.html','./admin-portal.html','./fl-assistant.html','./scanner.html','./manifest.webmanifest','./app-version.json','./platform-resolver.js?v=3','./platform-navigation.js?v=1','./platform-page-layout.js?v=12','./ui/desktop/desktop-shell.css?v=2','./ui/mobile/mobile-shell.css?v=4','./ui/desktop/desktop-shell.js?v=11','./ui/mobile/mobile-shell.js?v=11','./ui/desktop/home-layout.css?v=1','./ui/mobile/home-layout.css?v=1','./ui/desktop/home-layout.js?v=1','./ui/mobile/home-layout.js?v=1','./ui/desktop/profile-layout.css?v=1','./ui/mobile/profile-layout.css?v=1','./ui/desktop/profile-layout.js?v=1','./ui/mobile/profile-layout.js?v=1','./ui/desktop/user-pages-layout.css?v=1','./ui/mobile/user-pages-layout.css?v=1','./ui/desktop/user-pages-layout.js?v=1','./ui/mobile/user-pages-layout.js?v=1','./ui/mobile/settings-page.css?v=1','./ui/mobile/planning-layout.css?v=1','./ui/mobile/notification-settings-page.css?v=1','./ui/desktop/tool-pages-layout.css?v=1','./ui/mobile/tool-pages-layout.css?v=1','./ui/desktop/tool-pages-layout.js?v=1','./ui/mobile/tool-pages-layout.js?v=1','./ui/desktop/articles-layout.css?v=1','./ui/mobile/articles-layout.css?v=1','./ui/desktop/articles-layout.js?v=1','./ui/mobile/articles-layout.js?v=1','./ui/desktop/accounts-layout.css?v=1','./ui/mobile/accounts-layout.css?v=1','./ui/accounts-embedded.css?v=1','./ui/desktop/accounts-layout.js?v=1','./ui/mobile/accounts-layout.js?v=1','./ui/desktop/admin-portal-layout.css?v=1','./ui/mobile/admin-portal-layout.css?v=1','./ui/desktop/admin-portal-layout.js?v=1','./ui/mobile/admin-portal-layout.js?v=1','./ui/desktop/department-pages-layout.css?v=1','./ui/mobile/department-pages-layout.css?v=1','./ui/desktop/department-pages-layout.js?v=1','./ui/mobile/department-pages-layout.js?v=1','./ui/mobile/fl-assistant-page.css?v=1','./ui/mobile/bakery-page.css?v=1','./ui/desktop/rewards-layout.css?v=1','./ui/mobile/rewards-layout.css?v=1','./ui/desktop/rewards-layout.js?v=1','./ui/mobile/rewards-layout.js?v=1','./ui/desktop/chat-layout.css?v=1','./ui/mobile/chat-layout.css?v=1','./ui/desktop/chat-layout.js?v=1','./ui/mobile/chat-layout.js?v=1','./ui/desktop/planning-layout.css?v=2','./ui/mobile/planning-layout.css?v=2','./ui/desktop/planning-layout.js?v=1','./ui/mobile/planning-layout.js?v=1','./ui/desktop/planning-agenda.css?v=1','./ui/mobile/planning-agenda.css?v=1','./design-v2.css?v=3','./design-v3.css?v=3','./design-v4.css?v=9','./operations-widget.css?v=2','./operations-widget.js?v=2', './profile-ui.js?v=199','./profile-ui.js?v=200','./assets/nethor-mark.svg','./assets/app-icon-v63.svg','./assets/app-icon-mobile-v71.svg','./assets/avatar-frame-admin.svg','./assets/avatar-frame-responsable.svg','./assets/avatar-frame-point-vente.svg','./assets/avatar-frame-employe.svg','./assets/avatar-frame-lecture.svg','./assets/avatar-role-employe.svg','./assets/avatar-role-responsable.svg','./assets/avatar-role-caisse.svg','./assets/avatar-role-stock.svg','./assets/avatar-role-gerant.svg','./assets/logo-stock.svg','./assets/logo-planning.svg','./assets/logo-chat.svg','./assets/logo-article.svg','./assets/logo-boulangerie.svg?v=3','./assets/logo-home.svg','./assets/logo-profile.svg?v=3','./assets/logo-rewards.svg?v=3','./assets/logo-accounts.svg','./assets/logo-admin-portal.svg','./assets/logo-settings.svg','./assets/fl-background.webp'];
self.addEventListener('install',e=>{e.waitUntil((async()=>{const cache=await caches.open(CACHE);await Promise.allSettled(CORE.map(async url=>{const response=await fetch(url,{cache:'reload'});if(response&&response.ok)await cache.put(url,response.clone())}))})())});
self.addEventListener('activate',e=>{e.waitUntil((async()=>{
 const keys=await caches.keys();
 await Promise.all(keys.filter(k=>/^netto-tools-v\d+$/.test(k)&&k!==CACHE).map(k=>caches.delete(k)));
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
const STRICT_NAVIGATION_FILES=new Set(['index.html','maintenance.html','repair.html']);
function navigationFile(url){
 const path=String(url?.pathname||'');
 return (path.split('/').pop()||'index.html').toLowerCase()
}
self.addEventListener('fetch',e=>{
 const u=new URL(e.request.url);
 if(e.request.method!=='GET'||u.origin!==location.origin)return;
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

