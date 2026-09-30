(function(){
'use strict';
const ROOT=document.documentElement;
function platformKind(){
 const kind=String(window.NethorPlatform?.current?.()||ROOT.dataset.nethorPlatform||'desktop').toLowerCase();
 return kind==='desktop'?'desktop':'mobile'
}
function builder(){
 return platformKind()==='desktop'?window.NethorDesktopMaintenanceLayout:window.NethorMobileMaintenanceLayout
}
function mount(){
 const host=document.querySelector('[data-nethor-maintenance-layout]');
 const build=builder()?.build;
 if(!host||typeof build!=='function')return null;
 const layout=build();
 if(!layout?.html)return null;
 host.outerHTML=layout.html;
 ROOT.dataset.nethorPageLayout=layout.platform||platformKind();
 ROOT.dataset.nethorPageId='maintenance';
 ROOT.dataset.nethorMaintenanceStandalone='1';
 try{document.dispatchEvent(new CustomEvent('nethor:maintenance-layout-ready',{detail:{platform:ROOT.dataset.nethorPageLayout}}))}catch(_){}
 return layout
}
window.NethorMaintenancePageLayout=Object.freeze({mount,platformKind});
if(!mount()&&document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
})();