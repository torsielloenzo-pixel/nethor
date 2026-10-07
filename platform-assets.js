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
/* Applique les palettes mobiles sans modifier la navigation ni le rendu Desktop. */
function installMobileVisualThemes(){
 if(platformKind()!=='mobile')return;
 const root=document.documentElement,publicThemes=['mineral','sage','plum'];
 const colors={mineral:'#edf3f8',sage:'#eef3ef',plum:'#171623',halloween:'#120e17'};
 let activeProfile=null;
 const halloweenAllowed=profile=>{
  const role=String(profile?.role||'').trim().toLowerCase();
  const firstName=String(profile?.display_name||'').trim().toLowerCase().split(/\s+/)[0]||'';
  return role==='admin'||firstName==='enzo'
 };
 const normalize=(value,profile=activeProfile)=>{
  const theme=String(value||'').trim().toLowerCase();
  if(publicThemes.includes(theme))return theme;
  if(theme==='halloween'&&halloweenAllowed(profile))return theme;
  return''
 };
 function apply(value,base,profile=activeProfile){
  const custom=normalize(value,profile);
  const theme=['plum','halloween'].includes(custom)?'dark':custom?'light':base==='dark'?'dark':base==='light'?'light':root.dataset.theme==='dark'?'dark':'light';
  if(custom)root.dataset.nethorMobileTheme=custom;else delete root.dataset.nethorMobileTheme;
  if(root.dataset.theme!==theme)root.dataset.theme=theme;
  root.style.colorScheme=theme;
  const meta=document.head?.querySelector('meta[name="theme-color"]');
  if(meta)meta.content=colors[custom]||(theme==='dark'?'#17191d':'#f6f6f8');
  try{localStorage.setItem('nethorMobileTheme',custom);localStorage.setItem('nettoTheme',theme)}catch(_){}
 }
 try{
  const cached=localStorage.getItem('nethorMobileTheme');
  if(publicThemes.includes(cached))apply(cached)
 }catch(_){}
 const onProfile=e=>{
  const profile=e?.detail?.profile;
  if(!profile)return;
  activeProfile=profile;
  const prefs=profile.ui_preferences;
  if(prefs&&typeof prefs==='object')apply(prefs.mobile_theme,prefs.theme,profile)
 };
 window.addEventListener('netto:profile',onProfile);
 window.addEventListener('netto:theme-preference',e=>apply('',e?.detail?.theme,activeProfile));
 if(typeof MutationObserver==='function'){
  new MutationObserver(()=>{
   const custom=normalize(root.dataset.nethorMobileTheme,activeProfile);
   if(!custom)return;
   const required=['plum','halloween'].includes(custom)?'dark':'light';
   if(root.dataset.theme!==required)root.dataset.theme=required
  }).observe(root,{attributes:true,attributeFilter:['data-theme']})
 }
 function stylesheet(){
  if(document.getElementById('nethorMobilePaletteStyles'))return;
  const link=document.createElement('link');link.id='nethorMobilePaletteStyles';link.rel='stylesheet';link.href='ui/mobile/mobile-themes.css?v=3';document.head?.appendChild(link)
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',stylesheet,{once:true});else stylesheet()
}
installMobileVisualThemes();
window.NethorPlatformAssets=Object.freeze({
 kind:platformKind,
 style:writeStyle,
 script:writeScript,
 mobileStyle:writeMobileStyle
});
})();
