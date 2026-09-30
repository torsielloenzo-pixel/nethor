(function(){
'use strict';

const USER_MENU_PARENT_KEY='nethorUserMenuParentV2';
const MOBILE_PARENT_KEY='nethorMobileBackParentsV2';
const MOBILE_BACK_TRANSITION_KEY='nethorMobileBackTransitionV2';

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
 'admin-portal.html':{type:'url',value:'home.html'},
 'user-menu.html':{type:'url',value:'home.html'}
});

const MOBILE_VIEW_TARGETS=Object.freeze({
 home:'home.html',
 planning:'planning.html',
 chat:'chat.html',
 notifications:'notifications.html',
 'user-menu':'user-menu.html',
 profile:'profile.html',
 settings:'settings.html',
 'notification-settings':'notification-settings.html',
 'report-problem':'report-problem.html',
 scanner:'scanner.html',
 articles:'articles.html',
 accounts:'accounts.html',
 'admin-portal':'admin-portal.html',
 'fl-assistant':'fl-assistant.html',
 bakery:'bakery.html',
 rewards:'rewards.html'
});

const MOBILE_ROUTES=Object.freeze({
 'user-menu.html':{type:'url',value:'home.html'},
 'profile.html':{type:'url',value:'user-menu.html'},
 'settings.html':{type:'url',value:'user-menu.html'},
 'notification-settings.html':{type:'url',value:'user-menu.html'},
 'index.html':{type:'url',value:'user-menu.html'},
 'planning.html':{type:'url',value:'user-menu.html'},
 'chat.html':{type:'url',value:'user-menu.html'},
 'articles.html':{type:'url',value:'user-menu.html'},
 'scanner.html':{type:'url',value:'user-menu.html'},
 'bakery.html':{type:'url',value:'user-menu.html'},
 'rewards.html':{type:'url',value:'user-menu.html'},
 'admin-portal.html':{type:'url',value:'user-menu.html'},
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
function pageFile(raw=location.href){
 try{return (new URL(raw,location.href).pathname.split('/').pop()||'home.html').toLowerCase()}catch(_){return (location.pathname.split('/').pop()||'home.html').toLowerCase()}
}
function localUrl(raw,fallback='home.html'){
 try{
  const u=new URL(raw||fallback,location.href);
  if(u.origin!==location.origin)return new URL(fallback,location.href);
  return u
 }catch(_){return new URL(fallback,location.href)}
}
function internalUrl(raw){
 try{
  const u=new URL(raw||'',location.href);
  return u.origin===location.origin?u:null
 }catch(_){return null}
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
function cleanTransientNavigation(raw=location.href){
 const u=localUrl(raw);
 u.searchParams.delete('open_user_menu');
 u.searchParams.delete('from_user_menu');
 u.searchParams.delete('_nethor_update');
 return relative(inheritPlatformQuery(u))
}

/* Compatibilité temporaire avec les anciens appels du menu superposé. */
function cleanUserMenuParent(raw=location.href){return cleanTransientNavigation(raw)}
function rememberUserMenuParent(raw=location.href){
 const parent=cleanUserMenuParent(raw);
 try{sessionStorage.setItem(USER_MENU_PARENT_KEY,parent)}catch(_){}
 return parent
}
function userMenuChildUrl(raw){
 return relative(inheritPlatformQuery(localUrl(raw||'home.html')))
}
function userMenuReturnUrl(){
 return relative(inheritPlatformQuery(localUrl('user-menu.html')))
}

function readMobileParents(){
 try{
  const value=JSON.parse(sessionStorage.getItem(MOBILE_PARENT_KEY)||'{}');
  return value&&typeof value==='object'&&!Array.isArray(value)?value:{}
 }catch(_){return{}}
}
function writeMobileParents(value){
 try{sessionStorage.setItem(MOBILE_PARENT_KEY,JSON.stringify(value||{}))}catch(_){}
}
function rememberMobileParent(targetRaw,parentRaw=location.href){
 if(!isMobileShell())return'';
 const target=internalUrl(targetRaw),parent=internalUrl(parentRaw);
 if(!target||!parent)return'';
 const targetFile=pageFile(target.href),parentFile=pageFile(parent.href);
 if(!targetFile||targetFile===parentFile)return'';
 const parents=readMobileParents();
 parents[targetFile]=cleanTransientNavigation(parent.href);
 writeMobileParents(parents);
 return parents[targetFile]
}
function storedMobileParent(page=pageFile()){
 if(!isMobileShell())return'';
 const key=String(page||'').toLowerCase(),parents=readMobileParents(),raw=parents[key];
 if(!raw)return'';
 const u=internalUrl(raw);
 if(!u||pageFile(u.href)===pageFile()){
  delete parents[key];
  writeMobileParents(parents);
  return''
 }
 return cleanTransientNavigation(u.href)
}
function markBackTransition(targetRaw){
 if(!isMobileShell())return;
 try{sessionStorage.setItem(MOBILE_BACK_TRANSITION_KEY,JSON.stringify({target:pageFile(targetRaw),at:Date.now()}))}catch(_){}
}
function consumeBackTransition(){
 if(!isMobileShell())return false;
 try{
  const raw=sessionStorage.getItem(MOBILE_BACK_TRANSITION_KEY);
  if(!raw)return false;
  sessionStorage.removeItem(MOBILE_BACK_TRANSITION_KEY);
  const state=JSON.parse(raw),fresh=Date.now()-Number(state?.at||0)<15000;
  return fresh&&String(state?.target||'')===pageFile()
 }catch(_){return false}
}
function browserHistoryTraversal(){
 try{return performance.getEntriesByType?.('navigation')?.[0]?.type==='back_forward'}catch(_){return false}
}
function captureReferrerParent(){
 if(!isMobileShell())return;
 if(consumeBackTransition()||browserHistoryTraversal())return;
 const ref=internalUrl(document.referrer);
 if(!ref||pageFile(ref.href)===pageFile())return;
 rememberMobileParent(location.href,ref.href)
}
function inlineNavigationTarget(el){
 const code=String(el?.getAttribute?.('onclick')||'');
 if(!code)return'';
 const patterns=[
  /(?:window\.)?location\.href\s*=\s*['"]([^'"]+)['"]/i,
  /(?:window\.)?location\.assign\(\s*['"]([^'"]+)['"]\s*\)/i,
  /(?:window\.)?location\.replace\(\s*['"]([^'"]+)['"]\s*\)/i
 ];
 for(const pattern of patterns){
  const match=code.match(pattern);
  if(match?.[1])return match[1]
 }
 return''
}
function clickTargetUrl(event){
 const el=event.target?.closest?.('a[href],[data-url],[data-home-url],[formaction],[onclick]');
 if(!el)return null;
 if(el.matches('a[target="_blank"],a[download]'))return null;
 const raw=el.getAttribute('href')||el.dataset?.url||el.dataset?.homeUrl||el.getAttribute('formaction')||inlineNavigationTarget(el)||'';
 if(!raw||raw.startsWith('#')||/^javascript:/i.test(raw))return null;
 return internalUrl(raw)
}
function captureClickParent(event){
 if(!isMobileShell())return;
 const target=clickTargetUrl(event);
 if(!target||pageFile(target.href)===pageFile())return;
 rememberMobileParent(target.href,location.href)
}
function routeFor(page=pageFile()){
 const map=isMobileShell()?MOBILE_ROUTES:DESKTOP_ROUTES;
 return map[String(page||'').toLowerCase()]||{type:'url',value:'home.html'}
}
function finalizeBackTarget(target){
 if(isMobileShell())markBackTransition(target);
 return target
}
function backTarget(page=pageFile()){
 const route=routeFor(page);
 if(isMobileShell()){
  const parent=storedMobileParent(page);
  if(parent)return finalizeBackTarget(relative(inheritPlatformQuery(localUrl(parent))))
 }
 if(route.type==='user-menu')return finalizeBackTarget(userMenuReturnUrl());
 return finalizeBackTarget(relative(inheritPlatformQuery(localUrl(route.value||'home.html'))))
}
function navigateBack(){
 const target=backTarget();
 location.href=target;
 return target
}
function navigate(raw){
 const target=internalUrl(raw);
 if(!target){location.href=raw;return raw}
 if(isMobileShell())rememberMobileParent(target.href,location.href);
 const value=relative(inheritPlatformQuery(target));
 location.href=value;
 return value
}
function routeTable(){return isMobileShell()?MOBILE_ROUTES:DESKTOP_ROUTES}
function mobileViewTarget(view){
 const id=String(view||'').trim().toLowerCase().replace(/\.html$/,'');
 const file=MOBILE_VIEW_TARGETS[id]||'';
 return file?relative(inheritPlatformQuery(localUrl(file))):''
}
function mobileViewTable(){return MOBILE_VIEW_TARGETS}

window.NethorNavigation=Object.freeze({
 platform,
 isMobileShell,
 pageFile,
 routeFor,
 routeTable,
 mobileViewTarget,
 mobileViewTable,
 backTarget,
 navigateBack,
 navigate,
 rememberMobileParent,
 storedMobileParent,
 rememberUserMenuParent,
 cleanUserMenuParent,
 userMenuChildUrl,
 userMenuReturnUrl
});

document.addEventListener('click',captureClickParent,true);
captureReferrerParent();

try{
 window.dispatchEvent(new CustomEvent('nethor:navigation-ready',{detail:{platform:platform(),page:pageFile()}}))
}catch(_){}
})();
