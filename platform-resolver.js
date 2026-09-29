(function(){
'use strict';

const ROOT=document.documentElement;
const SESSION_KEY='nethorPlatformResolvedV1';
const OVERRIDE_KEY='nethorPlatformOverrideV1';
const VALID=new Set(['desktop','mobile']);

function params(){
 try{return new URLSearchParams(location.search)}catch(_){return new URLSearchParams()}
}
function isPreviewRequest(){
 return params().get('mobile_preview')==='1'
}
function queryOverride(){
 const value=String(params().get('nethor_platform')||'').toLowerCase();
 return VALID.has(value)?value:''
}
function storedOverride(){
 try{
  const value=String(localStorage.getItem(OVERRIDE_KEY)||'').toLowerCase();
  return VALID.has(value)?value:''
 }catch(_){return''}
}
function sessionPlatform(){
 try{
  const value=String(sessionStorage.getItem(SESSION_KEY)||'').toLowerCase();
  return VALID.has(value)?value:''
 }catch(_){return''}
}
function detectAutomatic(){
 try{
  if(navigator.userAgentData?.mobile===true)return'mobile';
  const ua=String(navigator.userAgent||'');
  if(/iPhone|iPod|iPad|Android|Windows Phone|webOS|BlackBerry|Opera Mini|IEMobile/i.test(ua))return'mobile';
  if(String(navigator.platform||'')==='MacIntel'&&Number(navigator.maxTouchPoints||0)>1)return'mobile';
  const coarse=window.matchMedia?.('(hover:none) and (pointer:coarse)')?.matches===true;
  const touch=Number(navigator.maxTouchPoints||0)>0;
  const sw=Number(screen.width)||0,sh=Number(screen.height)||0;
  const shortSide=sw&&sh?Math.min(sw,sh):0;
  if(coarse&&touch&&shortSide>0&&shortSide<=768)return'mobile'
 }catch(_){}
 return'desktop'
}
function pageId(){
 const file=(location.pathname.split('/').pop()||'home.html').toLowerCase();
 return file.replace(/\.html$/,'')||'home'
}
function resolve(){
 if(isPreviewRequest())return{kind:'mobile-preview',source:'preview'};
 const query=queryOverride();
 if(query){
  try{sessionStorage.setItem(SESSION_KEY,query)}catch(_){}
  return{kind:query,source:'query'}
 }
 const override=storedOverride();
 if(override)return{kind:override,source:'override'};
 const session=sessionPlatform();
 if(session)return{kind:session,source:'session'};
 const detected=detectAutomatic();
 try{sessionStorage.setItem(SESSION_KEY,detected)}catch(_){}
 return{kind:detected,source:'auto'}
}
function apply(state){
 const kind=state.kind;
 ROOT.dataset.nethorPlatform=kind;
 ROOT.dataset.nethorPlatformSource=state.source;
 ROOT.dataset.nethorPage=pageId();
 ROOT.classList.toggle('nethorPlatformDesktop',kind==='desktop');
 ROOT.classList.toggle('nethorPlatformMobile',kind==='mobile'||kind==='mobile-preview');
 ROOT.classList.toggle('nethorPlatformPreview',kind==='mobile-preview');
 return state
}

let state=apply(resolve());

const api=Object.freeze({
 current:()=>state.kind,
 source:()=>state.source,
 isDesktop:()=>state.kind==='desktop',
 isMobile:()=>state.kind==='mobile'||state.kind==='mobile-preview',
 isPreview:()=>state.kind==='mobile-preview',
 page:()=>ROOT.dataset.nethorPage||pageId(),
 setOverride(mode){
  const value=String(mode||'').toLowerCase();
  try{
   if(VALID.has(value))localStorage.setItem(OVERRIDE_KEY,value);
   else localStorage.removeItem(OVERRIDE_KEY);
   sessionStorage.removeItem(SESSION_KEY)
  }catch(_){}
  location.reload()
 },
 clearOverride(){
  try{
   localStorage.removeItem(OVERRIDE_KEY);
   sessionStorage.removeItem(SESSION_KEY)
  }catch(_){}
  location.reload()
 },
 describe:()=>({platform:state.kind,source:state.source,page:ROOT.dataset.nethorPage||pageId()})
});
window.NethorPlatform=api;

try{window.dispatchEvent(new CustomEvent('nethor:platform',{detail:api.describe()}))}catch(_){}
})();
