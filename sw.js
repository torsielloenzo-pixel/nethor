const APP_VERSION=142;
const CACHE='netto-tools-v142';
const CORE=['./rewards.html','./rewards.css?v=1','./rewards.js?v=3','./reward-profile.js?v=2','./','./index.html','./home.html','./maintenance.html','./articles.html','./bakery.html','./planning.html','./planning-agenda-v2.css?v=5','./planning-agenda-v2.js?v=8','./chat.html','./notifications.html','./notification-settings.html','./chat-v2.css?v=25','./chat-v2.js?v=22','./profile.html','./settings.html','./accounts.html','./admin-portal.html','./fl-assistant.html','./manifest.webmanifest','./app-version.json','./design-v2.css','./design-v3.css?v=3','./design-v4.css?v=8', './profile-ui.js?v=140','./assets/app-icon-v63.svg','./assets/app-icon-mobile-v71.svg','./assets/avatar-frame-admin.svg','./assets/avatar-frame-responsable.svg','./assets/avatar-frame-point-vente.svg','./assets/avatar-frame-employe.svg','./assets/avatar-frame-lecture.svg','./assets/avatar-role-employe.svg','./assets/avatar-role-responsable.svg','./assets/avatar-role-caisse.svg','./assets/avatar-role-stock.svg','./assets/avatar-role-gerant.svg','./assets/logo-stock.svg','./assets/logo-planning.svg','./assets/logo-chat.svg','./assets/logo-article.svg','./assets/logo-boulangerie.svg?v=3','./assets/logo-home.svg','./assets/logo-profile.svg?v=3','./assets/logo-rewards.svg?v=3','./assets/logo-accounts.svg','./assets/logo-admin-portal.svg','./assets/logo-settings.svg','./assets/fl-background.webp'];
self.addEventListener('install',e=>{e.waitUntil((async()=>{const cache=await caches.open(CACHE);await Promise.allSettled(CORE.map(url=>cache.add(url)));/* Une mise à jour reste en attente jusqu'au choix explicite de l'utilisateur. */})())});
self.addEventListener('activate',e=>{e.waitUntil(Promise.all([
 caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))),
 self.registration.getNotifications().then(list=>{list.forEach(n=>n.close())}).catch(()=>{}),
 self.clients.claim()
]))});
async function networkFirst(request,fallback){
 try{
  const response=await fetch(request,{cache:'no-cache'});
  if(response&&response.ok){const copy=response.clone();caches.open(CACHE).then(c=>c.put(request,copy)).catch(()=>{})}
  return response
 }catch(_){
  return (await caches.match(request))||(fallback?await caches.match(fallback):undefined)||Response.error()
 }
}
function cleanNavigationRequest(request){
 const u=new URL(request.url);u.search='';u.hash='';
 return new Request(u.href,{method:'GET'})
}
async function refreshNavigation(request){
 try{
  const response=await fetch(request,{cache:'no-cache'});
  if(response&&response.ok){
   const cache=await caches.open(CACHE);
   await cache.put(cleanNavigationRequest(request),response.clone())
  }
  return response
 }catch(_){return null}
}
async function navigationFromCache(request,refresh,fallback){
 const cache=await caches.open(CACHE);
 const cached=await cache.match(cleanNavigationRequest(request),{ignoreSearch:true});
 if(cached)return cached;
 const fresh=await refresh;
 if(fresh)return fresh;
 return (fallback?await cache.match(fallback,{ignoreSearch:true}):undefined)||Response.error()
}
async function refreshStatic(request){
 try{
  const response=await fetch(request,{cache:'no-cache'});
  if(response&&response.ok){
   const cache=await caches.open(CACHE);
   await cache.put(request,response.clone())
  }
  return response
 }catch(_){return null}
}
async function staticFromCache(request,refresh){
 const cache=await caches.open(CACHE);
 const cached=await cache.match(request);
 if(cached)return cached;
 return (await refresh)||Response.error()
}
self.addEventListener('fetch',e=>{
 const u=new URL(e.request.url);
 if(e.request.method!=='GET'||u.origin!==location.origin)return;
 if(e.request.mode==='navigate'){
  const refresh=refreshNavigation(e.request);
  e.waitUntil(refresh.then(()=>{}).catch(()=>{}));
  e.respondWith(navigationFromCache(e.request,refresh,'./home.html'));
  return;
 }
 if(u.pathname.endsWith('/app-version.json')){
  e.respondWith(networkFirst(e.request));
  return;
 }
 if(/\.(?:js|css|svg|png|webp|jpe?g|gif|webmanifest)$/i.test(u.pathname)){
  const refresh=refreshStatic(e.request);
  e.waitUntil(refresh.then(()=>{}).catch(()=>{}));
  e.respondWith(staticFromCache(e.request,refresh));
  return;
 }
 e.respondWith(caches.match(e.request).then(cached=>cached||networkFirst(e.request)));
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

self.addEventListener('message',e=>{
 const type=e.data&&e.data.type;
 if(type==='SKIP_WAITING'){self.skipWaiting();return}
 if(type==='GET_VERSION'&&e.ports&&e.ports[0])e.ports[0].postMessage({version:APP_VERSION,cache:CACHE});
});
