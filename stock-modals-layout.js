(function(){
'use strict';
const ROOT=document.documentElement;
function platformKind(){
 const kind=String(window.NethorPlatform?.current?.()||ROOT.dataset.nethorPlatform||'desktop').toLowerCase();
 return kind==='desktop'?'desktop':'mobile'
}
function builder(){
 return platformKind()==='desktop'?window.NethorDesktopStockModals:window.NethorMobileStockModals
}
function mount(){
 const host=document.querySelector('[data-nethor-stock-dialogs]');
 const build=builder()?.build;
 if(!host||typeof build!=='function')return null;
 const layout=build();
 if(!layout?.html)return null;
 host.outerHTML=layout.html;
 ROOT.dataset.nethorStockDialogs=layout.platform||platformKind();
 try{document.dispatchEvent(new CustomEvent('nethor:stock-dialogs-ready',{detail:{platform:ROOT.dataset.nethorStockDialogs}}))}catch(_){}
 return layout
}
window.NethorStockDialogsLayout=Object.freeze({mount,platformKind});
if(!mount()&&document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
})();