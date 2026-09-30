(function(){
'use strict';
const ROOT=document.documentElement;
function platformKind(){
 const kind=String(window.NethorPlatform?.current?.()||ROOT.dataset.nethorPlatform||'desktop').toLowerCase();
 return kind==='desktop'?'desktop':'mobile'
}
function builder(){
 return platformKind()==='desktop'?window.NethorDesktopLoginLayout:window.NethorMobileLoginLayout
}
function mount(){
 const host=document.querySelector('[data-nethor-login-layout]');
 const build=builder()?.build;
 if(!host||typeof build!=='function')return null;
 const layout=build();
 if(!layout?.html)return null;
 host.outerHTML=layout.html;
 ROOT.dataset.nethorLoginLayout=layout.platform||platformKind();
 try{document.dispatchEvent(new CustomEvent('nethor:login-layout-ready',{detail:{platform:ROOT.dataset.nethorLoginLayout}}))}catch(_){}
 return layout
}
window.NethorLoginPageLayout=Object.freeze({mount,platformKind});
if(!mount()&&document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
})();