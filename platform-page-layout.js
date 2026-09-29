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
function homeShell(){
 return platformKind()==='desktop'?window.NethorDesktopHomeLayout:window.NethorMobileHomeLayout
}
function profileShell(){
 return platformKind()==='desktop'?window.NethorDesktopProfileLayout:window.NethorMobileProfileLayout
}
function userPagesShell(){
 return platformKind()==='desktop'?window.NethorDesktopUserPagesLayout:window.NethorMobileUserPagesLayout
}
function toolPagesShell(){
 return platformKind()==='desktop'?window.NethorDesktopToolPagesLayout:window.NethorMobileToolPagesLayout
}
function articlesShell(){
 return platformKind()==='desktop'?window.NethorDesktopArticlesLayout:window.NethorMobileArticlesLayout
}
function replaceHost(selector,html){
 const host=document.querySelector(selector);
 if(!host)return false;
 if(html)host.outerHTML=html;
 else host.remove();
 return true
}
function mountArticles(id){
 if(id!=='articles')return null;
 const builder=articlesShell()?.build;
 if(typeof builder!=='function')return null;
 const layout=builder();
 if(!layout)return null;
 replaceHost('[data-nethor-articles-layout]',layout.html||'');
 ROOT.dataset.nethorArticlesLayout=layout.platform||platformKind();
 return layout
}
function mountToolPage(id){
 if(!['notifications','scanner'].includes(id))return null;
 const builder=toolPagesShell()?.build;
 if(typeof builder!=='function')return null;
 const layout=builder(id);
 if(!layout)return null;
 replaceHost('[data-nethor-tool-page-layout]',layout.html||'');
 ROOT.dataset.nethorToolPageLayout=layout.platform||platformKind();
 return layout
}
function mountUserPage(id){
 if(!['settings','notification-settings','report-problem'].includes(id))return null;
 const builder=userPagesShell()?.build;
 if(typeof builder!=='function')return null;
 const layout=builder(id);
 if(!layout)return null;
 replaceHost('[data-nethor-user-page-layout]',layout.html||'');
 ROOT.dataset.nethorUserPageLayout=layout.platform||platformKind();
 return layout
}
function mountProfile(id){
 if(id!=='profile')return null;
 const builder=profileShell()?.build;
 if(typeof builder!=='function')return null;
 const layout=builder();
 if(!layout)return null;
 replaceHost('[data-nethor-profile-layout]',layout.html||'');
 ROOT.dataset.nethorProfileLayout=layout.platform||platformKind();
 return layout
}
function mountHome(id){
 if(id!=='home')return null;
 const builder=homeShell()?.build;
 if(typeof builder!=='function')return null;
 const layout=builder();
 if(!layout)return null;
 replaceHost('[data-nethor-home-layout]',layout.html||'');
 ROOT.dataset.nethorHomeLayout=layout.platform||platformKind();
 return layout
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
 const articles=mountArticles(id);
 const toolPage=mountToolPage(id);
 const userPage=mountUserPage(id);
 const profile=mountProfile(id);
 const home=mountHome(id);
 const planning=mountPlanning(id);
 try{
  document.dispatchEvent(new CustomEvent('nethor:page-layout-ready',{
   detail:{page:id,platform:ROOT.dataset.nethorPageLayout,articles:articles?.platform||null,toolPage:toolPage?.platform||null,userPage:userPage?.platform||null,profile:profile?.platform||null,home:home?.platform||null,planning:planning?.platform||null}
  }))
 }catch(_){}
 return layout
}
window.NethorPageLayout=Object.freeze({mount,mountArticles,mountToolPage,mountUserPage,mountProfile,mountHome,mountPlanning,pageId,platformKind});
if(!mount()&&document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
})();