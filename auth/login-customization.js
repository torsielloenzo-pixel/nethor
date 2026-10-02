/* Nethor — application des réglages d'écran de connexion */
(function(){
'use strict';
if(typeof window.applyAuthBranding!=='function')return;
const baseApply=window.applyAuthBranding;
const DEFAULTS={
 brand_text:'Nethor',email_placeholder:'Identifiant',password_placeholder:'Mot de passe',
 submit_text:'Se connecter',forgot_text:'Mot de passe oublié ?',footer_text:'Accès réservé aux utilisateurs autorisés',
 feature_management:'Gestion',feature_planning:'Planning',feature_stock:'Stock',feature_team:'Équipe',background_opacity:100
};
function cleanTheme(x,fallback){
 x=x&&typeof x==='object'?x:{};fallback=fallback&&typeof fallback==='object'?fallback:DEFAULTS;
 const get=k=>x[k]===undefined?String(fallback[k]??DEFAULTS[k]??''):String(x[k]),n=Number(x.background_opacity);
 return{
  brand_text:get('brand_text'),email_placeholder:get('email_placeholder'),password_placeholder:get('password_placeholder'),
  submit_text:get('submit_text'),forgot_text:get('forgot_text'),footer_text:get('footer_text'),
  feature_management:get('feature_management'),feature_planning:get('feature_planning'),feature_stock:get('feature_stock'),feature_team:get('feature_team'),
  background_opacity:Number.isFinite(n)?Math.max(0,Math.min(100,n)):Math.max(0,Math.min(100,Number.isFinite(Number(fallback.background_opacity))?Number(fallback.background_opacity):100))
 }
}
function themed(node,theme,fallback=''){
 node=node&&typeof node==='object'?node:{};
 const t=theme==='dark'?'dark':'light',variant=node[t]&&typeof node[t]==='object'?node[t]:{},light=node.light&&typeof node.light==='object'?node.light:{};
 return String(variant.url||(t==='dark'?light.url:'')||node.url||fallback||'').trim()
}
function setIcon(el,url){
 if(!el)return;
 if(url){el.classList.add('hasCustomLoginIcon');el.style.setProperty('--auth-custom-login-icon','url('+JSON.stringify(url)+')')}
 else{el.classList.remove('hasCustomLoginIcon');el.style.removeProperty('--auth-custom-login-icon')}
}
function setSubmitText(button,text){
 if(!button)return;
 const textNode=[...button.childNodes].find(n=>n.nodeType===Node.TEXT_NODE);
 if(textNode)textNode.nodeValue=String(text||'')+' ';
 else button.insertBefore(document.createTextNode(String(text||'')+' '),button.firstChild)
}
window.applyAuthBranding=function(){
 baseApply();
 const kind=authPlatformKind(),ui=authPlatformUi(),theme=authTheme(),brand=authSiteConfig?.brand||{};
 const light=cleanTheme(ui?.login_settings?.light,{...DEFAULTS,brand_text:String(brand.name||'Nethor')});
 const settings=theme==='dark'?cleanTheme(ui?.login_settings?.dark,light):light;
 const root=document.querySelector(kind==='desktop'?'.authDesktopRoot':'.authMobileRoot');
 if(!root)return;

 const bg=themed(ui?.login_background,theme,'assets/fl-background.webp');
 root.style.setProperty('--auth-login-background','url('+JSON.stringify(bg)+')');
 root.style.setProperty('--auth-login-background-opacity',String(Math.max(0,Math.min(1,Number(settings.background_opacity)/100))));

 const primary=root.querySelector('.authMobileLogo,.authDesktopLogo');
 if(primary)primary.hidden=false;

 const textEl=root.querySelector('.authMobileBrandCopy strong,.authDesktopName');
 const wordmarkUrl=themed(ui?.login_wordmark,theme,'');
 let wordmark=root.querySelector('.authLoginWordmark');
 if(!wordmark){
  wordmark=document.createElement('img');wordmark.className='authLoginWordmark';wordmark.alt='';
  textEl?.parentNode?.insertBefore(wordmark,textEl||null)
 }
 if(wordmarkUrl){
  if(wordmark.getAttribute('src')!==wordmarkUrl)wordmark.src=wordmarkUrl;
  wordmark.hidden=false;if(textEl)textEl.hidden=true
 }else{
  wordmark.hidden=true;
  if(textEl){textEl.hidden=false;textEl.textContent=settings.brand_text}
 }

 const email=root.querySelector('#email'),password=root.querySelector('#password');
 if(email)email.placeholder=settings.email_placeholder;
 if(password)password.placeholder=settings.password_placeholder;
 setSubmitText(root.querySelector('.loginSubmit'),settings.submit_text);
 const forgot=root.querySelector('.forgotBtn');if(forgot)forgot.textContent=settings.forgot_text;
 const foot=root.querySelector('.loginFoot');if(foot)foot.textContent=settings.footer_text;

 const featureLabels=[settings.feature_management,settings.feature_planning,settings.feature_stock,settings.feature_team];
 root.querySelectorAll('.authFeature small').forEach((el,i)=>{if(featureLabels[i]!==undefined)el.textContent=featureLabels[i]});

 const fieldIcons=root.querySelectorAll('.authFieldIcon');
 setIcon(fieldIcons[0],themed(ui?.login_icon_user,theme,''));
 setIcon(fieldIcons[1],themed(ui?.login_icon_password,theme,''));
 const featureIcons=root.querySelectorAll('.authFeature>span');
 ['management','planning','stock','team'].forEach((key,i)=>setIcon(featureIcons[i],themed(ui?.['login_icon_'+key],theme,'')))
};
})();
