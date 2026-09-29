(function(){
'use strict';

const USER_MENU_PARENT_KEY='nethorUserMenuParentV2';

const DESKTOP_ROUTES=Object.freeze({
 'profile.html':{type:'url',value:'home.html'},
 'settings.html':{type:'url',value:'home.html'},
 'notification-settings.html':{type:'url',value:'home.html'},
 'notifications.html':{type:'url',value:'home.html'},
 'index.html':{type:'url',value:'home.html'},
 'planning.html':{type:'url',value:'home.html'},
 'chat.html':{type:'url',value:'home.html'},
 'articles.html':{type:'url',value:'home.html'},
 'scanner.html':{type:'url',value:'home.html'},
 'fl-assistant.html':{type:'url',value:'index.html?mode=manage'},
 'bakery.html':{type:'url',value:'home.html'},
 'rewards.html':{type:'url',value:'home.html'},
 'accounts.html':{type:'url',value:'admin-portal.html'},
 'admin-portal.html':{type:'url',value:'home.html'}
});

const MOBILE_ROUTES=Object.freeze({
 'profile.html':{type:'user-menu'},
 'settings.html':{type:'user-menu'},
 'notification-settings.html':{type:'user-menu'},
 'index.html':{type:'user-menu'},
 'planning.html':{type:'user-menu'},
 'chat.html':{type:'user-menu'},
 'articles.html':{type:'user-menu'},
 'scanner.html':{type:'user-menu'},
 'bakery.html':{type:'user-menu'},
 'rewards.html':{type:'user-menu'},
 'admin-portal.html':{type:'user-menu'},
 'notifications.html':{type:'url',value:'home.html'},
 'accounts.html':{type:'url',value:'admin-portal.html'},
 'fl-assistant.html':{type:'url',value:'index.html?mode=manage'}
});

function platform(){
 try{return window.NethorPlatform?.current?.()||document.documentElement.dataset.nethorPlatform||'desktop'}catch(_){return'desktop'}
}
function isMobileShell(){
 const value=platform();
 return value==='mobile'||value==='mobile-preview'
}
function pageFile(){
 return (location.pathname.split('/').pop()||'home.html').toLowerCase()
}
function localUrl(raw,fallback='home.html'){
 try{
  const u=new URL(raw||fallback,location.href);
  if(u.origin!==location.origin)return new URL(fallback,location.href);
  return u
 }catch(_){return new URL(fallback,location.href)}
}
function inheritPlatformQuery(u){
 try{
  if(window.NethorPlatform?.isPreview?.())u.searchParams.set('mobile_preview','1');
  const forced=new URLSearchParams(location.search).get('nethor_platform');
  if(forced==='desktop'||forced==='mobile')u.searchParams.set('nethor_platform',forced)
 }catch(_){}
 return u
}
function relative(u){
 return (u.pathname.split('/').pop()||'home.html')+u.search+u.hash
}
function cleanUserMenuParent(raw=location.href){
 const u=localUrl(raw);
 u.searchParams.delete('open_user_menu');
 u.searchParams.delete('from_user_menu');
 return relative(inheritPlatformQuery(u))
}
function rememberUserMenuParent(raw=location.href){
 const parent=cleanUserMenuParent(raw);
 try{sessionStorage.setItem(USER_MENU_PARENT_KEY,parent)}catch(_){}
 return parent
}
function storedUserMenuParent(){
 try{return cleanUserMenuParent(sessionStorage.getItem(USER_MENU_PARENT_KEY)||'home.html')}catch(_){return'home.html'}
}
function userMenuChildUrl(raw){
 const u=localUrl(raw);
 u.searchParams.set('from_user_menu','1');
 return relative(inheritPlatformQuery(u))
}
function userMenuReturnUrl(){
 const fromMenu=new URLSearchParams(location.search).get('from_user_menu')==='1';
 const parent=fromMenu?storedUserMenuParent():'home.html';
 const u=localUrl(parent);
 u.searchParams.delete('from_user_menu');
 u.searchParams.set('open_user_menu','1');
 return relative(inheritPlatformQuery(u))
}
function routeFor(page=pageFile()){
 const map=isMobileShell()?MOBILE_ROUTES:DESKTOP_ROUTES;
 return map[String(page||'').toLowerCase()]||{type:'url',value:'home.html'}
}
function backTarget(page=pageFile()){
 const route=routeFor(page);
 if(route.type==='user-menu')return userMenuReturnUrl();
 return relative(inheritPlatformQuery(localUrl(route.value||'home.html')))
}
function navigateBack(){
 location.href=backTarget()
}
function routeTable(){
 return isMobileShell()?MOBILE_ROUTES:DESKTOP_ROUTES
}

window.NethorNavigation=Object.freeze({
 platform,
 isMobileShell,
 pageFile,
 routeFor,
 routeTable,
 backTarget,
 navigateBack,
 rememberUserMenuParent,
 cleanUserMenuParent,
 userMenuChildUrl,
 userMenuReturnUrl
});

try{
 window.dispatchEvent(new CustomEvent('nethor:navigation-ready',{detail:{platform:platform(),page:pageFile()}}))
}catch(_){}
})();
