(function(){
'use strict';
const ROOT=document.documentElement;
function platformKind(){
 const kind=String(window.NethorPlatform?.current?.()||ROOT.dataset.nethorPlatform||'desktop').toLowerCase();
 return kind==='desktop'?'desktop':'mobile'
}
function builder(){
 return platformKind()==='desktop'?window.NethorDesktopStockLayout:window.NethorMobileStockLayout
}
function replaceHost(selector,html){
 const host=document.querySelector(selector);
 if(!host)return false;
 if(html)host.outerHTML=html; else host.remove();
 return true
}
function mount(){
 const build=builder()?.build;
 if(typeof build!=='function')return null;
 const layout=build();
 if(!layout)return null;
 replaceHost('[data-nethor-stock-header]',layout.header||'');
 replaceHost('[data-nethor-stock-mode-nav]',layout.modeNav||'');
 ROOT.dataset.nethorStockLayout=layout.platform||platformKind();
 ROOT.dataset.nethorPageLayout=layout.platform||platformKind();
 ROOT.dataset.nethorPageId='index';
 try{document.dispatchEvent(new CustomEvent('nethor:stock-layout-ready',{detail:{platform:ROOT.dataset.nethorStockLayout}}))}catch(_){}
 return layout
}
window.NethorStockPageLayout=Object.freeze({mount,platformKind});
if(!mount()&&document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
})();