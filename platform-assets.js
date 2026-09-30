(function(){
'use strict';

function platformKind(){
 try{return window.NethorPlatform?.isMobile?.()?'mobile':'desktop'}catch(_){return'desktop'}
}
function skipCurrentPlatformAssets(){
 try{
  const page=String(window.NethorPlatform?.page?.()||document.documentElement.dataset.nethorPage||'').toLowerCase();
  return page==='user-menu'&&platformKind()==='desktop'
 }catch(_){return false}
}
function safeAsset(raw){
 const value=String(raw||'').trim();
 if(!/^ui\/(?:desktop|mobile)\/[a-z0-9_./?=&-]+$/i.test(value))throw new Error('Ressource de plateforme invalide: '+value);
 return value
}
function writeStyle(desktopHref,mobileHref){
 if(skipCurrentPlatformAssets())return;
 const kind=platformKind(),href=safeAsset(kind==='mobile'?mobileHref:desktopHref);
 document.write('<link rel="stylesheet" href="'+href+'" media="all" data-nethor-shell="'+kind+'" data-nethor-platform-asset="1">')
}
function writeScript(desktopSrc,mobileSrc){
 if(skipCurrentPlatformAssets())return;
 const kind=platformKind(),src=safeAsset(kind==='mobile'?mobileSrc:desktopSrc);
 document.write('<script src="'+src+'" data-nethor-platform-asset="1"><\/script>')
}
function writeMobileStyle(href){
 if(platformKind()!=='mobile')return;
 href=safeAsset(href);
 document.write('<link rel="stylesheet" href="'+href+'" media="all" data-nethor-shell="mobile" data-nethor-platform-asset="1">')
}
window.NethorPlatformAssets=Object.freeze({
 kind:platformKind,
 style:writeStyle,
 script:writeScript,
 mobileStyle:writeMobileStyle
});
})();
