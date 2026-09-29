(function(){
'use strict';
const ROOT=document.documentElement;
function pageId(){
 const file=(location.pathname.split('/').pop()||'home.html').toLowerCase();
 return file.replace(/\.html$/,'')||'home'
}
function platformKind(){
 const api=window.NethorPlatform;
 const kind=String(api?.current?.()||ROOT.dataset.nethorPlatform||'desktop').toLowerCase();
 return kind==='desktop'?'desktop':'mobile'
}
function shell(){
 return platformKind()==='desktop'?window.NethorDesktopShell:window.NethorMobileShell
}
function mount(){
 const id=pageId();
 const builder=shell()?.buildPageLayout;
 if(typeof builder!=='function')return null;
 const layout=builder(id);
 if(!layout)return null;
 const headerHost=document.querySelector('[data-nethor-platform-header]');
 const leadHost=document.querySelector('[data-nethor-platform-lead]');
 if(headerHost){
  if(layout.header)headerHost.outerHTML=layout.header;
  else headerHost.remove()
 }
 if(leadHost){
  if(layout.lead)leadHost.outerHTML=layout.lead;
  else leadHost.remove()
 }
 ROOT.dataset.nethorPageLayout=layout.platform||platformKind();
 ROOT.dataset.nethorPageId=id;
 if(layout.handlesBack)ROOT.dataset.nethorPageBackHandled='1';
 else delete ROOT.dataset.nethorPageBackHandled;
 try{document.dispatchEvent(new CustomEvent('nethor:page-layout-ready',{detail:{page:id,platform:ROOT.dataset.nethorPageLayout}}))}catch(_){}
 return layout
}
window.NethorPageLayout=Object.freeze({mount,pageId,platformKind});
if(!mount()&&document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
})();