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
function planningShell(){
 return platformKind()==='desktop'?window.NethorDesktopPlanningLayout:window.NethorMobilePlanningLayout
}
function replaceHost(selector,html){
 const host=document.querySelector(selector);
 if(!host)return false;
 if(html)host.outerHTML=html;
 else host.remove();
 return true
}
function mountPlanning(id){
 if(id!=='planning')return null;
 const builder=planningShell()?.build;
 if(typeof builder!=='function')return null;
 const layout=builder();
 if(!layout)return null;
 replaceHost('[data-nethor-planning-top]',layout.top||'');
 replaceHost('[data-nethor-planning-toolbar]',layout.toolbar||'');
 replaceHost('[data-nethor-planning-source-actions]',layout.sourceActions||'');
 replaceHost('[data-nethor-planning-mobile-actions]',layout.mobileActions||'');
 replaceHost('[data-nethor-planning-mobile-schedule]',layout.mobileSchedule||'');
 ROOT.dataset.nethorPlanningLayout=layout.platform||platformKind();
 return layout
}
function mount(){
 const id=pageId();
 const builder=shell()?.buildPageLayout;
 if(typeof builder!=='function')return null;
 const layout=builder(id);
 if(!layout)return null;
 replaceHost('[data-nethor-platform-header]',layout.header||'');
 replaceHost('[data-nethor-platform-lead]',layout.lead||'');
 ROOT.dataset.nethorPageLayout=layout.platform||platformKind();
 ROOT.dataset.nethorPageId=id;
 if(layout.handlesBack)ROOT.dataset.nethorPageBackHandled='1';
 else delete ROOT.dataset.nethorPageBackHandled;
 const planning=mountPlanning(id);
 try{
  document.dispatchEvent(new CustomEvent('nethor:page-layout-ready',{
   detail:{page:id,platform:ROOT.dataset.nethorPageLayout,planning:planning?.platform||null}
  }))
 }catch(_){}
 return layout
}
window.NethorPageLayout=Object.freeze({mount,mountPlanning,pageId,platformKind});
if(!mount()&&document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
})();