const APP_VERSION=154;
const CACHE='netto-tools-v154';
const CORE=['./rewards.html','./rewards.css?v=1','./rewards.js?v=3','./reward-profile.js?v=2','./','./index.html','./home.html','./maintenance.html','./articles.html','./bakery.html','./planning.html','./planning-agenda-v2.css?v=8','./planning-agenda-v2.js?v=9','./chat.html','./notifications.html','./notification-settings.html','./chat-v2.css?v=25','./chat-v2.js?v=23','./profile.html','./settings.html','./accounts.html','./admin-portal.html','./fl-assistant.html','./manifest.webmanifest','./app-version.json','./design-v2.css','./design-v3.css?v=3','./design-v4.css?v=8', './profile-ui.js?v=149','./assets/app-icon-v63.svg','./assets/app-icon-mobile-v71.svg','./assets/avatar-frame-admin.svg','./assets/avatar-frame-responsable.svg','./assets/avatar-frame-point-vente.svg','./assets/avatar-frame-employe.svg','./assets/avatar-frame-lecture.svg','./assets/avatar-role-employe.svg','./assets/avatar-role-responsable.svg','./assets/avatar-role-caisse.svg','./assets/avatar-role-stock.svg','./assets/avatar-role-gerant.svg','./assets/logo-stock.svg','./assets/logo-planning.svg','./assets/logo-chat.svg','./assets/logo-article.svg','./assets/logo-boulangerie.svg?v=3','./assets/logo-home.svg','./assets/logo-profile.svg?v=3','./assets/logo-rewards.svg?v=3','./assets/logo-accounts.svg','./assets/logo-admin-portal.svg','./assets/logo-settings.svg','./assets/fl-background.webp'];
self.addEventListener('install',e=>{e.waitUntil((async()=>{const cache=await caches.open(CACHE);await Promise.allSettled(CORE.map(url=>cache.add(url)));/* Une mise à jour reste en attente jusqu'au choix explicite de l'utilisateur. */})())});
self.addEventListener('activate',e=>{e.waitUntil((async()=>{
 const keys=await caches.keys();
 const appCaches=keys.filter(k=>/^netto-tools-v\d+$/.test(k)).sort((a,b)=>(Number((b.match(/\d+$/)||[])[0])||0)-(Number((a.match(/\d+$/)||[])[0])||0));
 const keep=new Set([CACHE,...appCaches.filter(k=>k!==CACHE).slice(0,1)]);
 await Promise.all(keys.filter(k=>/^netto-tools-v\d+$/.test(k)&&!keep.has(k)).map(k=>caches.delete(k)));
 await self.registration.getNotifications().then(list=>{list.forEach(n=>n.close())}).catch(()=>{});
 await self.clients.claim()
})())});
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
async function appCacheNames(){
 const keys=await caches.keys();
 return keys.filter(k=>/^netto-tools-v\d+$/.test(k)).sort((a,b)=>(Number((b.match(/\d+$/)||[])[0])||0)-(Number((a.match(/\d+$/)||[])[0])||0))
}
async function stableCacheMatch(request,options){
 const current=await caches.open(CACHE);
 const direct=await current.match(request,options);
 if(direct)return direct;
 const names=await appCacheNames();
 for(const name of names){
  if(name===CACHE)continue;
  const hit=await (await caches.open(name)).match(request,options);
  if(hit)return hit
 }
 return null
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
 if(cached)return cached;
 const fresh=await fetchAndStore(request,key);
 if(fresh)return fresh;
 return (fallback?await stableCacheMatch(fallback,{ignoreSearch:true}):null)||Response.error()
}
async function staticFromCache(request){
 const cached=await stableCacheMatch(request);
 if(cached)return cached;
 return (await fetchAndStore(request))||Response.error()
}
self.addEventListener('fetch',e=>{
 const u=new URL(e.request.url);
 if(e.request.method!=='GET'||u.origin!==location.origin)return;
 if(e.request.mode==='navigate'){
  e.respondWith(navigationFromCache(e.request,'./home.html'));
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

self.addEventListener('message',e=>{
 const type=e.data&&e.data.type;
 if(type==='SKIP_WAITING'){self.skipWaiting();return}
 if(type==='GET_VERSION'&&e.ports&&e.ports[0])e.ports[0].postMessage({version:APP_VERSION,cache:CACHE});
});
